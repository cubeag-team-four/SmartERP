"""Review sentiment use cases: analyse, store, list and report.

The route handler calls these functions; they call the shared model from the
registry. The tenant is always the verified caller's, and any customer/product
link in a request is checked against that tenant before anything is stored.
"""

import uuid
from datetime import date, datetime, time, timedelta, timezone
from decimal import ROUND_HALF_UP, Decimal

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.common.exceptions import BadRequestException, NotFoundException
from app.core.config import settings
from app.models.crm import Customer
from app.models.review_analysis import ReviewAnalysisBatch, ReviewAnalysisResult
from app.models.sales import Product
from app.models.user import User
from app.modules.ai.audit import safe_metadata
from app.modules.ai.ml import data
from app.modules.ai.ml.registry import get_sentiment_model, require_libraries
from app.modules.ai.ml.sentiment import (
    NEGATIVE,
    NEUTRAL,
    POSITIVE,
    clean_review,
    extract_topics,
    recurring_complaints,
)
from app.modules.audit.service import record_audit
from app.schemas.ml import (
    ReviewSentiment,
    SentimentAnalyzeRequest,
    SentimentBatchList,
    SentimentBatchListItem,
    SentimentBatchOut,
    SentimentOverview,
    SentimentSummary,
)

ENTITY_SENTIMENT = "ai_sentiment"
AI_SENTIMENT_ANALYZED = "AI_SENTIMENT_ANALYZED"

#: Stored reviews read back to recompute topics for an overview.
OVERVIEW_TEXT_LIMIT = 2000

_PROBABILITY = Decimal("0.0001")


def _pct(count: int, total: int) -> float:
    return round(100.0 * count / total, 2) if total else 0.0


def _build_summary(
    counts: dict[str, int], texts: list[str], labels: list[str]
) -> SentimentSummary:
    """Counts and percentages from ``counts``; topics/complaints from the texts."""
    require_libraries("sklearn")
    pos, neu, neg = (counts.get(k, 0) for k in (POSITIVE, NEUTRAL, NEGATIVE))
    total = pos + neu + neg
    topics = extract_topics(texts, labels)
    return SentimentSummary(
        total_reviews=total,
        positive_count=pos,
        neutral_count=neu,
        negative_count=neg,
        positive_pct=_pct(pos, total),
        neutral_pct=_pct(neu, total),
        negative_pct=_pct(neg, total),
        net_sentiment=round((pos - neg) / total, 4) if total else 0.0,
        positive_topics=topics[POSITIVE],
        negative_topics=topics[NEGATIVE],
        recurring_complaints=recurring_complaints(texts, labels),
    )


def summarize(texts: list[str], labels: list[str]) -> SentimentSummary:
    """Counts, percentages, topics and complaints for a set of classified reviews."""
    counts = {label: labels.count(label) for label in (POSITIVE, NEUTRAL, NEGATIVE)}
    return _build_summary(counts, texts, labels)


def _check_links(db: Session, tenant_id: uuid.UUID, payload: SentimentAnalyzeRequest) -> None:
    """Every referenced customer/product must be a live row of this tenant.

    One IN query per entity. Another tenant's id reads as "not found", never as
    "exists elsewhere".
    """
    for model, attr, label in ((Customer, "customer_id", "customer"),
                               (Product, "product_id", "product")):
        wanted = {getattr(r, attr) for r in payload.reviews if getattr(r, attr)}
        missing = wanted - data.existing_ids(db, model, tenant_id, wanted)
        if missing:
            raise BadRequestException(
                f"Unknown {label} referenced by a review.",
                details={f"{label}_ids": sorted(str(i) for i in missing)},
            )


def analyze_reviews(
    db: Session, actor: User, payload: SentimentAnalyzeRequest
) -> SentimentBatchOut:
    if len(payload.reviews) > settings.ML_SENTIMENT_MAX_REVIEWS:
        raise BadRequestException(
            f"At most {settings.ML_SENTIMENT_MAX_REVIEWS} reviews can be analysed per request."
        )
    _check_links(db, actor.tenant_id, payload)

    texts = [clean_review(review.text) for review in payload.reviews]
    if not all(texts):
        raise BadRequestException("A review is empty after removing markup and links.")

    model = get_sentiment_model(payload.language)
    scores = model.predict(texts, settings.ML_SENTIMENT_BATCH_SIZE)

    reviews: list[ReviewSentiment] = []
    for position, (review, text, score) in enumerate(zip(payload.reviews, texts, scores)):
        label, confidence = model.label(score)
        reviews.append(ReviewSentiment(
            position=position,
            text=text,
            label=label,
            confidence=round(confidence, 4),
            scores={k: round(v, 4) for k, v in score.items()},
            customer_id=review.customer_id,
            product_id=review.product_id,
            external_ref=review.external_ref,
        ))
    summary = summarize(texts, [r.label for r in reviews])

    out = SentimentBatchOut(
        source=payload.source, language=payload.language, model_name=model.name,
        stored=payload.store, summary=summary, reviews=reviews,
    )
    if not payload.store:
        return out

    batch = ReviewAnalysisBatch(
        tenant_id=actor.tenant_id,
        source=payload.source,
        language=payload.language,
        model_name=model.name,
        total_reviews=summary.total_reviews,
        positive_count=summary.positive_count,
        neutral_count=summary.neutral_count,
        negative_count=summary.negative_count,
        summary=_stored_summary(summary),
        created_by_id=actor.id,
    )
    batch.results = [
        ReviewAnalysisResult(
            tenant_id=actor.tenant_id,
            position=r.position,
            customer_id=r.customer_id,
            product_id=r.product_id,
            external_ref=r.external_ref,
            review_text=r.text,
            label=r.label,
            confidence=Decimal(str(r.confidence)).quantize(_PROBABILITY, ROUND_HALF_UP),
            scores=r.scores,
        )
        for r in reviews
    ]
    db.add(batch)
    db.flush()

    record_audit(
        db,
        action=AI_SENTIMENT_ANALYZED,
        entity_type=ENTITY_SENTIMENT,
        entity_id=batch.id,
        tenant_id=actor.tenant_id,
        user_id=actor.id,
        description="Customer reviews analysed for sentiment",
        # Counts only: review text is customer content and stays out of the trail.
        metadata=safe_metadata(
            model=model.name,
            reviews=summary.total_reviews,
            positive=summary.positive_count,
            neutral=summary.neutral_count,
            negative=summary.negative_count,
        ),
    )
    out.id = batch.id
    out.created_at = batch.created_at
    return out


def _stored_summary(summary: SentimentSummary) -> dict:
    return summary.model_dump(
        mode="json",
        include={"net_sentiment", "positive_topics", "negative_topics", "recurring_complaints"},
    )


def _summary_from_batch(batch: ReviewAnalysisBatch) -> SentimentSummary:
    total = batch.total_reviews
    stored = batch.summary or {}
    return SentimentSummary(
        total_reviews=total,
        positive_count=batch.positive_count,
        neutral_count=batch.neutral_count,
        negative_count=batch.negative_count,
        positive_pct=_pct(batch.positive_count, total),
        neutral_pct=_pct(batch.neutral_count, total),
        negative_pct=_pct(batch.negative_count, total),
        net_sentiment=stored.get("net_sentiment", 0.0),
        positive_topics=stored.get("positive_topics", []),
        negative_topics=stored.get("negative_topics", []),
        recurring_complaints=stored.get("recurring_complaints", []),
    )


def list_batches(
    db: Session, tenant_id: uuid.UUID, limit: int, offset: int
) -> SentimentBatchList:
    base = select(ReviewAnalysisBatch).where(ReviewAnalysisBatch.tenant_id == tenant_id)
    total = db.scalar(select(func.count()).select_from(base.subquery())) or 0
    rows = db.scalars(
        base.order_by(ReviewAnalysisBatch.created_at.desc()).limit(limit).offset(offset)
    ).all()
    return SentimentBatchList(
        items=[
            SentimentBatchListItem(
                id=b.id, created_at=b.created_at, source=b.source, language=b.language,
                model_name=b.model_name, total_reviews=b.total_reviews,
                positive_pct=_pct(b.positive_count, b.total_reviews),
                neutral_pct=_pct(b.neutral_count, b.total_reviews),
                negative_pct=_pct(b.negative_count, b.total_reviews),
            )
            for b in rows
        ],
        total=total, limit=limit, offset=offset,
    )


def get_batch(db: Session, tenant_id: uuid.UUID, batch_id: uuid.UUID) -> SentimentBatchOut:
    batch = db.scalar(
        select(ReviewAnalysisBatch).where(
            ReviewAnalysisBatch.id == batch_id, ReviewAnalysisBatch.tenant_id == tenant_id
        )
    )
    if batch is None:
        raise NotFoundException("Sentiment analysis not found")
    return SentimentBatchOut(
        id=batch.id,
        created_at=batch.created_at,
        source=batch.source,
        language=batch.language,
        model_name=batch.model_name,
        stored=True,
        summary=_summary_from_batch(batch),
        reviews=[
            ReviewSentiment(
                position=r.position, text=r.review_text, label=r.label,
                confidence=float(r.confidence), scores=r.scores or {},
                customer_id=r.customer_id, product_id=r.product_id,
                external_ref=r.external_ref,
            )
            for r in batch.results
        ],
    )


def overview(
    db: Session,
    tenant_id: uuid.UUID,
    date_from: date | None,
    date_to: date | None,
    product_id: uuid.UUID | None = None,
    customer_id: uuid.UUID | None = None,
) -> SentimentOverview:
    """All stored reviews in a date range (optionally one product/customer).

    Counts are aggregated in SQL over every matching review; topics and
    complaints are recomputed from the most recent :data:`OVERVIEW_TEXT_LIMIT`
    reviews, which keeps the request bounded however much history exists.
    """
    if date_from and date_to and date_from > date_to:
        raise BadRequestException("date_from must not be after date_to.")
    filters = [ReviewAnalysisResult.tenant_id == tenant_id]
    if date_from:
        filters.append(ReviewAnalysisResult.created_at
                       >= datetime.combine(date_from, time.min, tzinfo=timezone.utc))
    if date_to:
        filters.append(ReviewAnalysisResult.created_at
                       < datetime.combine(date_to + timedelta(days=1), time.min, tzinfo=timezone.utc))
    if product_id:
        filters.append(ReviewAnalysisResult.product_id == product_id)
    if customer_id:
        filters.append(ReviewAnalysisResult.customer_id == customer_id)

    counts = dict(db.execute(
        select(ReviewAnalysisResult.label, func.count())
        .where(*filters).group_by(ReviewAnalysisResult.label)
    ).all())
    batches = db.scalar(
        select(func.count(func.distinct(ReviewAnalysisResult.batch_id))).where(*filters)
    ) or 0
    recent = db.execute(
        select(ReviewAnalysisResult.review_text, ReviewAnalysisResult.label)
        .where(*filters)
        .order_by(ReviewAnalysisResult.created_at.desc())
        .limit(OVERVIEW_TEXT_LIMIT)
    ).all()

    return SentimentOverview(
        date_from=date_from,
        date_to=date_to,
        batches=batches,
        summary=_build_summary(
            counts, [row[0] for row in recent], [row[1] for row in recent]
        ),
    )
