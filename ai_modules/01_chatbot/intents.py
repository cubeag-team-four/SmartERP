"""Controlled business-intent vocabulary for the AI assistant.

This module is deliberately the *only* place that decides what the assistant is
allowed to look at. It maps a free-text question onto one of a fixed set of
intents, each of which is bound to a dashboard section that already owns its own
permission and SQL. The language model never appears in this decision.

Because routing is a deterministic keyword match, the assistant can only ever
ask the dashboard service functions for data those functions already expose. No
query text, table name or filter can be supplied by the caller or invented by
the model.
"""

from enum import Enum


class Intent(str, Enum):
    """Supported business intents. The value is the API-visible identifier."""

    SALES_SUMMARY = "SALES_SUMMARY"
    SALES_TREND = "SALES_TREND"
    PURCHASE_SUMMARY = "PURCHASE_SUMMARY"
    INVENTORY_SUMMARY = "INVENTORY_SUMMARY"
    LOW_STOCK = "LOW_STOCK"
    FINANCE_SUMMARY = "FINANCE_SUMMARY"
    RECEIVABLES = "RECEIVABLES"
    CRM_SUMMARY = "CRM_SUMMARY"
    LEAD_CONVERSION = "LEAD_CONVERSION"
    PENDING_APPROVALS = "PENDING_APPROVALS"
    BUSINESS_SUMMARY = "BUSINESS_SUMMARY"


# The dashboard section each intent reads. Reusing the dashboard's own section
# keys means the AI layer inherits the dashboard's permission mapping instead of
# introducing a second, parallel authorization model.
INTENT_SECTIONS: dict[Intent, str] = {
    Intent.SALES_SUMMARY: "sales",
    Intent.SALES_TREND: "sales",
    Intent.PURCHASE_SUMMARY: "purchase",
    Intent.INVENTORY_SUMMARY: "inventory",
    Intent.LOW_STOCK: "inventory",
    Intent.FINANCE_SUMMARY: "finance",
    Intent.RECEIVABLES: "finance",
    Intent.CRM_SUMMARY: "crm",
    Intent.LEAD_CONVERSION: "crm",
    Intent.PENDING_APPROVALS: "approvals",
    # Business summary spans every section the caller may see; the context
    # builder intersects it with the caller's actual permissions.
    Intent.BUSINESS_SUMMARY: "*",
}

# Keywords per intent, matched case-insensitively against the question.
# Multi-word phrases are listed first so a specific phrase wins over a broad
# single word ("low in stock" must beat "stock").
INTENT_KEYWORDS: dict[Intent, tuple[str, ...]] = {
    Intent.LOW_STOCK: (
        "low in stock",
        "low stock",
        "low inventory",
        "stock level",
        "reorder",
        "shortage",
        "running out",
        "out of stock",
        "depleted",
    ),
    Intent.RECEIVABLES: (
        "receivable",
        "money owed",
        "amount owed",
        "who owes",
        "outstanding",
        "unpaid",
        "still owe",
        "collectable",
        "debtors",
    ),
    Intent.LEAD_CONVERSION: (
        "conversion rate",
        "convert rate",
        "converted",
        "conversion",
    ),
    Intent.SALES_TREND: (
        "sales trend",
        "trend",
        "over time",
        "daily sales",
        "graph",
        "chart",
        "trajectory",
        "progression",
        "up or down",
    ),
    Intent.PENDING_APPROVALS: (
        "pending approval",
        "pending approvals",
        "awaiting approval",
        "waiting approval",
        "approval",
        "approvals",
        "approve",
    ),
    Intent.CRM_SUMMARY: (
        "lead",
        "leads",
        "pipeline",
        "crm",
        "prospect",
        "customer",
        "customers",
    ),
    Intent.SALES_SUMMARY: (
        "sales",
        "sold",
        "revenue",
        "turnover",
        "order book",
        "bookings",
        "top selling",
        "how much did we sell",
    ),
    Intent.PURCHASE_SUMMARY: (
        "purchase",
        "purchases",
        "purchased",
        "purchasing",
        "procurement",
        "vendor spend",
        "supplier spend",
        "buying from",
    ),
    Intent.INVENTORY_SUMMARY: (
        "inventory",
        "stock",
        "warehouse",
        "on hand",
        "on-hand",
        "how much stock",
        "current stock",
    ),
    Intent.FINANCE_SUMMARY: (
        "finance",
        "financial",
        "invoice",
        "invoices",
        "payment",
        "payments",
        "cash",
        "billing",
        "collection",
        "accounting",
    ),
    Intent.BUSINESS_SUMMARY: (
        "summary",
        "overview",
        "business",
        "how are we doing",
        "how is the business",
        "performance",
        "overall",
        "big picture",
        "activity",
        "everything",
    ),
}

# Salience order: the first intent whose keywords appear wins. Narrow intents
# are listed before broad ones so "which products are low in stock?" resolves to
# LOW_STOCK rather than a generic inventory answer.
INTENT_PRIORITY: tuple[Intent, ...] = (
    Intent.LOW_STOCK,
    Intent.RECEIVABLES,
    Intent.LEAD_CONVERSION,
    Intent.SALES_TREND,
    Intent.PENDING_APPROVALS,
    Intent.SALES_SUMMARY,
    Intent.PURCHASE_SUMMARY,
    Intent.INVENTORY_SUMMARY,
    Intent.FINANCE_SUMMARY,
    Intent.CRM_SUMMARY,
    Intent.BUSINESS_SUMMARY,
)


def detect_intent(question: str) -> Intent | None:
    """Map a question onto a supported intent, or ``None`` when it is unsafe.

    Returning ``None`` is a first-class outcome: the caller answers with the
    supported-topic list instead of guessing, so an unrecognised question never
    reaches the database or the model.
    """
    text = question.lower()
    for intent in INTENT_PRIORITY:
        if any(keyword in text for keyword in INTENT_KEYWORDS[intent]):
            return intent
    return None


# Human-readable section names used in AI responses and citations.
SECTION_LABELS: dict[str, str] = {
    "sales": "Sales Dashboard",
    "purchase": "Purchase Dashboard",
    "inventory": "Inventory Dashboard",
    "finance": "Finance Dashboard",
    "crm": "CRM Dashboard",
    "approvals": "Approvals Dashboard",
}