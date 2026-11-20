"""Customer support chatbot: deterministic routing over real ERP data.

The security model is the order of operations, and it is fixed:

1. **Authenticate.** The caller arrives from the existing JWT dependency.
2. **Route deterministically.** A keyword match against a fixed vocabulary picks
   the intent. The language model never participates in this decision.
3. **Extract entity *references*** — an order number, a product code, a customer
   code are pulled out of the message as plain strings. These are lookup keys,
   never query fragments.
4. **Authorise, then fetch.** The intent maps to an existing permission, and the
   fetch is scoped to the JWT's tenant. A cross-tenant reference therefore
   resolves to nothing at all rather than to another company's data.
5. **Build a small context** of already-controlled fields.
6. **Call the provider once**, for prose only.
7. **Attach backend-generated sources.**

The model is never in the authorisation path and never emits a query, so
prompt injection in the customer's message can only affect the *wording* of an
answer that is already bounded by steps 3-5.
"""

import re
import uuid
from dataclasses import dataclass, field
from datetime import date, timedelta
from decimal import Decimal
from typing import Any

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.common.money import DISPLAY_CURRENCY
from app.models.crm import Customer
from app.models.inventory import InventoryStock
from app.models.sales import Product, SalesOrder
from app.modules.auth.scope import RecordScope, as_record_scope
from app.schemas.chatbot import ChatSource

# ---------------------------------------------------------------- constants

#: Permission required for each intent that touches business data. These are the
#: project's existing codes — no parallel authorization model is introduced.
INTENT_PERMISSIONS: dict[str, str | tuple[str, ...] | None] = {
    "ORDER_STATUS": "sales.order.view",
    "ORDER_DETAILS": "sales.order.view",
    "PRODUCT_AVAILABILITY": "inventory.stock.view",
    "PRODUCT_DETAILS": "sales.product.view",
    # The answer is the customer's *sales orders*, so it needs the right to read
    # orders as well as the customer.
    "CUSTOMER_ORDER_HISTORY": ("crm.customer.view", "sales.order.view"),
    "HUMAN_ESCALATION": None,
    "UNSUPPORTED": None,
}

#: Escalation is a customer-facing action with its own permission, so a read-only
#: account cannot silently queue work for the support team.
ESCALATION_PERMISSION = "chatbot.escalate"

#: The gate for using the chatbot at all.
CHATBOT_PERMISSION = "chatbot.use"

#: Escalation is checked first: whoever asks for a person gets a person, even if
#: their message also happens to contain "order".
ESCALATION_KEYWORDS: tuple[str, ...] = (
    "human",
    "human support",
    "real person",
    "live agent",
    "talk to an agent",
    "speak to someone",
    "speak to a person",
    "connect me to support",
    "contact support",
    "escalate",
    "escalate this",
    "supervisor",
    "manager",
    "representative",
    "customer service",
)

ORDER_KEYWORDS: tuple[str, ...] = (
    "order status",
    "status of my order",
    "my order",
    "where is my order",
    "track",
    "shipment",
    "delivery",
    "dispatch",
)
ORDER_DETAIL_KEYWORDS: tuple[str, ...] = (
    "order details",
    "details of order",
    "what did i order",
    "order total",
    "order value",
    "show me order",
)

AVAILABILITY_KEYWORDS: tuple[str, ...] = (
    "in stock",
    "is it available",
    "availability",
    "available quantity",
    "do you have",
    "how many are in stock",
    "stock level",
    "do you still have",
)

PRODUCT_KEYWORDS: tuple[str, ...] = (
    "product details",
    "tell me about",
    "what is the product",
    "product information",
    "specification",
    "specs",
    "product code",
)

HISTORY_KEYWORDS: tuple[str, ...] = (
    "order history",
    "purchase history",
    "what has this customer ordered",
    "customer history",
    "their orders",
    "history for customer",
)

#: An entity reference: a document/product/customer code shaped like
#: ``SO-10025`` or ``CUS_9f2a``. Deliberately permissive about shape — the real
#: filter is an exact, tenant-scoped equality lookup, never a LIKE or a pattern
#: the caller controls.
REFERENCE_PATTERN = re.compile(r"\b([A-Za-z]{1,8}[-_][A-Za-z0-9][A-Za-z0-9_-]{1,30})\b")

#: Guard rails so a long conversation history or a pasted document cannot turn
#: one question into an unbounded query.
MAX_REFERENCES = 5
MAX_CONTEXT_RECORDS = 5
MAX_HISTORY_DAYS = 365

ZERO = Decimal("0")

# --------------------------------------------------------------- detection


def detect_chatbot_intent(message: str) -> tuple[str, list[str]]:
    """Map a support message onto an intent plus the references it names.

    Pure string work: no database access and no model call. Escalation wins over
    everything else so an explicit request for a person is never mis-routed.
    """
    text = message.lower()
    references = [match.group(1) for match in REFERENCE_PATTERN.finditer(message)]
    # Preserve order, drop repeats, and cap the count.
    references = list(dict.fromkeys(references))[:MAX_REFERENCES]

    def has(keywords: tuple[str, ...]) -> bool:
        return any(keyword in text for keyword in keywords)

    # 1. Escalation first: an explicit request for a human outranks the topic.
    if has(ESCALATION_KEYWORDS):
        return "HUMAN_ESCALATION", references
    # 2. Customer history before the order topics: "order history" is more
    #    specific than "order details", and it would otherwise be swallowed by
    #    the broader order-detail phrase match.
    if has(HISTORY_KEYWORDS):
        return "CUSTOMER_ORDER_HISTORY", references
    # 3. Order topics, most specific first.
    if has(ORDER_DETAIL_KEYWORDS):
        return "ORDER_DETAILS", references
    if has(ORDER_KEYWORDS) or (references and "order" in text):
        return "ORDER_STATUS", references
    # 4. Stock questions beat generic product questions ("is X in stock?" is an
    #    availability question, not a specification question).
    if has(AVAILABILITY_KEYWORDS) or "stock" in text:
        return "PRODUCT_AVAILABILITY", references
    if has(PRODUCT_KEYWORDS):
        return "PRODUCT_DETAILS", references

    return "UNSUPPORTED", references


def sanitise_message(message: str) -> str:
    """Bound the message and strip control characters.

    The text is wrapped in delimiters in the prompt and treated as data, but it
    still arrives from an untrusted caller, so control characters and the closing
    delimiters are removed before it reaches the model.
    """
    cleaned = "".join(
        char
        for char in message
        if char in "\n\t" or not (ord(char) < 32 or 127 <= ord(char) <= 159)
    )
    return (
        cleaned.replace("</support_context>", "")
        .replace("</customer_message>", "")
        .strip()
    )


# ----------------------------------------------------------------- context


@dataclass
class ChatContext:
    """What the backend decided the model is allowed to see.

    ``records`` is a list of small, already-controlled dicts. ``sources`` is built
    from the same objects, so a citation can never name a record that was not
    actually fetched for this tenant.
    """

    intent: str
    records: list[dict[str, Any]] = field(default_factory=list)
    sources: list[ChatSource] = field(default_factory=list)
    #: Set when the message named something that does not exist or is not
    #: visible to this caller. The model is told plainly rather than being given
    #: a half-answer to work around.
    not_found: str | None = None

    def payload(self) -> dict[str, Any]:
        """The exact block sent to the model."""
        body: dict[str, Any] = {"intent": self.intent, "currency": DISPLAY_CURRENCY}
        if self.not_found:
            body["result"] = "not_found"
            body["detail"] = self.not_found
        else:
            body["result"] = "found"
            body["records"] = self.records
        return body


def _money(value: Decimal) -> str:
    return f"{Decimal(value or 0):.2f}"


def _qty(value: Decimal) -> str:
    return f"{Decimal(value or 0):.3f}"


def _customer_label(customer: Customer | None) -> str:
    """A display name with no contact details — nothing the caller did not
    already need in order to ask about an order."""
    if customer is None:
        return "Unknown customer"
    name = " ".join(part for part in (customer.first_name, customer.last_name) if part)
    return name or customer.customer_code


def _find_orders(
    db: Session, tenant_id: uuid.UUID, references: list[str], in_scope: tuple = ()
) -> list[SalesOrder]:
    """Exact, tenant-scoped order lookup by the references in the message.

    Equality against a literal string, always with ``tenant_id``. A reference
    belonging to another company therefore matches nothing -- and (P2-06) nor
    does an order outside the caller's ``sales.order.view`` scope (``in_scope``).
    """
    if not references:
        return []
    return list(
        db.execute(
            select(SalesOrder)
            .where(
                SalesOrder.tenant_id == tenant_id,
                SalesOrder.deleted_at.is_(None),
                SalesOrder.order_number.in_(references),
                *in_scope,
            )
            .order_by(SalesOrder.order_date.desc())
            .limit(MAX_CONTEXT_RECORDS)
        ).scalars().all()
    )


def _find_products(
    db: Session, tenant_id: uuid.UUID, references: list[str]
) -> list[Product]:
    """Exact, tenant-scoped product lookup by code."""
    if not references:
        return []
    return list(
        db.execute(
            select(Product)
            .where(
                Product.tenant_id == tenant_id,
                Product.deleted_at.is_(None),
                Product.product_code.in_(references),
            )
            .limit(MAX_CONTEXT_RECORDS)
        ).scalars().all()
    )


def _find_customers(
    db: Session, tenant_id: uuid.UUID, references: list[str], name: str
) -> list[Customer]:
    """Tenant-scoped customer lookup by code, or by a name in the message."""
    if references:
        found = list(
            db.execute(
                select(Customer)
                .where(
                    Customer.tenant_id == tenant_id,
                    Customer.deleted_at.is_(None),
                    Customer.customer_code.in_(references),
                )
                .limit(MAX_CONTEXT_RECORDS)
            ).scalars().all()
        )
        if found:
            return found

    # Fall back to a name match. Still tenant-scoped and bounded, so a broad
    # phrase cannot enumerate the customer table.
    cleaned = name.strip()[:60]
    if len(cleaned) < 3:
        return []
    return list(
        db.execute(
            select(Customer)
            .where(
                Customer.tenant_id == tenant_id,
                Customer.deleted_at.is_(None),
                or_(
                    Customer.first_name.ilike(f"%{cleaned}%"),
                    Customer.last_name.ilike(f"%{cleaned}%"),
                ),
            )
            .limit(MAX_CONTEXT_RECORDS)
        ).scalars().all()
    )


def _order_records(
    db: Session, tenant_id: uuid.UUID, orders: list[SalesOrder]
) -> tuple[list[dict], list[ChatSource]]:
    """Controlled order fields plus the customer's display name.

    Only what a support answer needs: no internal ids beyond the reference, and
    deliberately no free-text notes, which could carry anything at all.
    """
    if not orders:
        return [], []

    customer_ids = {order.customer_id for order in orders}
    customers = {
        customer.id: customer
        for customer in db.execute(
            select(Customer).where(
                Customer.tenant_id == tenant_id, Customer.id.in_(customer_ids)
            )
        ).scalars().all()
    }

    records: list[dict[str, Any]] = []
    sources: list[ChatSource] = []
    for order in orders:
        records.append(
            {
                "order_number": order.order_number,
                "status": order.status,
                "order_date": order.order_date.isoformat(),
                "customer": _customer_label(customers.get(order.customer_id)),
                "total_amount": _money(order.total_amount),
            }
        )
        sources.append(
            ChatSource(
                source_type="sales_order",
                source_id=str(order.id),
                label=f"Order {order.order_number}",
            )
        )
    return records, sources


def _stock_records(
    db: Session, tenant_id: uuid.UUID, products: list[Product]
) -> tuple[list[dict], list[ChatSource]]:
    """Available quantity per product, totalled across warehouses.

    ``stock_status`` is decided here rather than left to the model, so the answer
    cannot misread a quantity as available when it is merely present.
    """
    if not products:
        return [], []

    balances = db.execute(
        select(
            InventoryStock.product_id.label("product_id"),
            func.sum(InventoryStock.available_quantity).label("available"),
            func.sum(InventoryStock.quantity).label("on_hand"),
            func.sum(InventoryStock.reserved_quantity).label("reserved"),
            func.min(InventoryStock.reorder_level).label("reorder_level"),
            func.count(func.distinct(InventoryStock.warehouse_id)).label("warehouses"),
        )
        .where(
            InventoryStock.tenant_id == tenant_id,
            InventoryStock.product_id.in_([p.id for p in products]),
        )
        .group_by(InventoryStock.product_id)
    ).all()
    by_product = {row[0]: row for row in balances}

    records: list[dict[str, Any]] = []
    sources: list[ChatSource] = []
    for product in products:
        row = by_product.get(product.id)
        available = Decimal(row[1] or 0) if row else ZERO
        reorder = Decimal(row[4] or 0) if row and row[4] is not None else None

        if not row:
            status = "not_stocked"
        elif available <= ZERO:
            status = "out_of_stock"
        elif reorder is not None and available < reorder:
            status = "low"
        else:
            status = "in_stock"

        records.append(
            {
                "product_code": product.product_code,
                "product_name": product.name,
                "available_quantity": _qty(available),
                "on_hand_quantity": _qty(Decimal(row[2] or 0)) if row else "0.000",
                "reserved_quantity": _qty(Decimal(row[3] or 0)) if row else "0.000",
                "reorder_level": _qty(reorder) if reorder is not None else None,
                "warehouse_count": int(row[5] or 0) if row else 0,
                "stock_status": status,
            }
        )
        sources.append(
            ChatSource(
                source_type="product_stock",
                source_id=str(product.id),
                label=f"Stock for {product.product_code}",
            )
        )
    return records, sources


def _product_records(
    products: list[Product],
) -> tuple[list[dict], list[ChatSource]]:
    """Controlled catalogue fields. Prices are exact decimal strings."""
    records: list[dict[str, Any]] = []
    sources: list[ChatSource] = []
    for product in products:
        records.append(
            {
                "product_code": product.product_code,
                "name": product.name,
                "description": product.description,
                "unit": product.unit,
                "unit_price": _money(product.unit_price),
                "tax_rate": f"{Decimal(product.tax_rate or 0):.2f}",
                "is_active": bool(product.is_active),
            }
        )
        sources.append(
            ChatSource(
                source_type="product",
                source_id=str(product.id),
                label=f"Product {product.product_code}",
            )
        )
    return records, sources


def _history_records(
    db: Session, tenant_id: uuid.UUID, customers: list[Customer], in_scope: tuple = ()
) -> tuple[list[dict], list[ChatSource]]:
    """Recent orders for the named customers, within this tenant and (P2-06)
    the caller's ``sales.order.view`` scope (``in_scope``)."""
    if not customers:
        return [], []

    since = date.today() - timedelta(days=MAX_HISTORY_DAYS)
    orders = db.execute(
        select(SalesOrder)
        .where(
            SalesOrder.tenant_id == tenant_id,
            SalesOrder.deleted_at.is_(None),
            SalesOrder.customer_id.in_([c.id for c in customers]),
            SalesOrder.order_date >= since,
            *in_scope,
        )
        .order_by(SalesOrder.order_date.desc())
        .limit(MAX_CONTEXT_RECORDS)
    ).scalars().all()

    if not orders:
        return [], []

    records = [
        {
            "order_number": order.order_number,
            "status": order.status,
            "order_date": order.order_date.isoformat(),
            "total_amount": _money(order.total_amount),
        }
        for order in orders
    ]
    sources = [
        ChatSource(
            source_type="sales_order",
            source_id=str(order.id),
            label=f"Order {order.order_number}",
        )
        for order in orders
    ]
    sources.extend(
        ChatSource(
            source_type="customer",
            source_id=str(customer.id),
            label=f"Customer {customer.customer_code}",
        )
        for customer in customers
    )
    return records, sources


def build_chat_context(
    db: Session,
    tenant_id: uuid.UUID,
    intent: str,
    references: list[str],
    message: str,
    *,
    scope: RecordScope,
) -> ChatContext:
    """Fetch the records for one intent, scoped to the caller's tenant.

    This is the only place business data is read for the chatbot, and it runs
    after the permission check. Every query carries ``tenant_id``, so a
    reference to another company's record simply matches nothing.

    P2-06: order reads also carry the caller's ``sales.order.view`` record scope
    (``scope``, required), so an order outside it is "not found" and never
    reaches the provider prompt.
    """
    scope = as_record_scope(scope)
    orders_in_scope = tuple(scope.conditions("sales.order.view"))
    if intent in ("ORDER_STATUS", "ORDER_DETAILS"):
        orders = _find_orders(db, tenant_id, references, orders_in_scope)
        records, sources = _order_records(db, tenant_id, orders)
        if not records:
            return ChatContext(
                intent=intent,
                not_found=(
                    "No matching order was found for this company. The customer "
                    "should be told the order reference could not be located."
                ),
            )
        return ChatContext(intent=intent, records=records, sources=sources)

    if intent == "PRODUCT_AVAILABILITY":
        products = _find_products(db, tenant_id, references)
        records, sources = _stock_records(db, tenant_id, products)
        if not records:
            return ChatContext(
                intent=intent,
                not_found="No matching product was found for this company.",
            )
        return ChatContext(intent=intent, records=records, sources=sources)

    if intent == "PRODUCT_DETAILS":
        products = _find_products(db, tenant_id, references)
        records, sources = _product_records(products)
        if not records:
            return ChatContext(
                intent=intent,
                not_found="No matching product was found for this company.",
            )
        return ChatContext(intent=intent, records=records, sources=sources)

    if intent == "CUSTOMER_ORDER_HISTORY":
        customers = _find_customers(db, tenant_id, references, message)
        records, sources = _history_records(db, tenant_id, customers, orders_in_scope)
        if not records:
            return ChatContext(
                intent=intent,
                not_found=(
                    "No customer matching that reference was found in this "
                    "company, or they have no orders in the last year."
                ),
            )
        return ChatContext(intent=intent, records=records, sources=sources)

    # Escalation and unsupported need no data at all.
    return ChatContext(intent=intent)


# --------------------------------------------------------------- responses


UNSUPPORTED_ANSWER = (
    "I can help with order status and details, product availability and product "
    "information, and customer order history. I could not match your question to "
    "one of those. You can ask a support agent to take it from here."
)

ESCALATION_ANSWER = (
    "I have flagged this conversation for a member of our support team to follow "
    "up. Please note this has been recorded as a request for human assistance; it "
    "is not a live chat with an agent, and no one has been contacted yet."
)


def escalation_answer() -> str:
    return ESCALATION_ANSWER


def unsupported_answer() -> str:
    return UNSUPPORTED_ANSWER


__all__ = [
    "CHATBOT_PERMISSION",
    "ESCALATION_PERMISSION",
    "INTENT_PERMISSIONS",
    "ChatContext",
    "build_chat_context",
    "detect_chatbot_intent",
    "escalation_answer",
    "sanitise_message",
    "unsupported_answer",
]