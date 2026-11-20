"""AI audit actions and safe metadata helpers.

Every AI interaction is recorded through the existing ``record_audit`` helper, so
AI activity appears in the same tenant-scoped trail as the rest of the ERP and is
covered by the dashboard's existing activity feed.

What is deliberately **not** stored: the API key, any access or refresh token,
and the full question/answer text. A user's natural-language question and the
model's prose can both contain commercially sensitive material, and the audit
table is read back by the dashboard. Only classification metadata is written —
intent, outcome, period, section names, question length and duration.
"""

from app.modules.audit.service import AuditAction

#: AI feature identifiers used as the audit ``entity_type``.
ENTITY_ASSISTANT = "ai_assistant"
ENTITY_INSIGHTS = "ai_insights"
ENTITY_REPORT = "ai_report"
ENTITY_FRAUD = "ai_fraud"
ENTITY_WORKFLOW = "ai_workflow"
ENTITY_CHATBOT = "ai_chatbot"
ENTITY_MAINTENANCE = "ai_maintenance"

# Added to the shared AuditAction catalogue. These are plain string constants, so
# declaring them here keeps the AI module self-contained while still writing the
# same values the rest of the audit trail uses.
AI_ASSISTANT_ANSWERED = "AI_ASSISTANT_ANSWERED"
AI_ASSISTANT_UNSUPPORTED = "AI_ASSISTANT_UNSUPPORTED"
AI_ASSISTANT_UNAUTHORIZED = "AI_ASSISTANT_UNAUTHORIZED"
AI_ASSISTANT_FAILED = "AI_ASSISTANT_FAILED"
AI_ASSISTANT_REJECTED = "AI_ASSISTANT_REJECTED"
AI_INSIGHTS_GENERATED = "AI_INSIGHTS_GENERATED"
AI_INSIGHTS_INSUFFICIENT = "AI_INSIGHTS_INSUFFICIENT"
AI_REPORT_GENERATED = "AI_REPORT_GENERATED"
#: The report data was produced but the AI explanation was not.
AI_REPORT_PARTIAL = "AI_REPORT_PARTIAL"
#: The report could not be completed, including a rejected request.
AI_REPORT_FAILED = "AI_REPORT_FAILED"
AI_REPORT_DENIED = "AI_REPORT_DENIED"
AI_FRAUD_SCANNED = "AI_FRAUD_SCANNED"
AI_FRAUD_FLAG_CREATED = "AI_FRAUD_FLAG_CREATED"
AI_FRAUD_FLAG_REVIEWED = "AI_FRAUD_FLAG_REVIEWED"
AI_WORKFLOW_RUN = "AI_WORKFLOW_RUN"
AI_WORKFLOW_EVENT_CREATED = "AI_WORKFLOW_EVENT_CREATED"
AI_WORKFLOW_EVENT_RESOLVED = "AI_WORKFLOW_EVENT_RESOLVED"
AI_CHATBOT_REQUEST = "AI_CHATBOT_REQUEST"
AI_CHATBOT_ESCALATED = "AI_CHATBOT_ESCALATED"
AI_CHATBOT_UNAUTHORIZED = "AI_CHATBOT_UNAUTHORIZED"
#: Manufacturing AI (FR-M6-05). The assessment is deterministic, so the audit
#: records the outcome and the evidence summary, never a prediction artefact.
AI_MACHINE_RISK_ASSESSED = "AI_MACHINE_RISK_ASSESSED"
#: Reserved for a future proactive-maintenance work order creation action. Not
#: emitted today, because the Work Order model requires a production BOM.
AI_MAINTENANCE_WORK_ORDER_CREATED = "AI_MAINTENANCE_WORK_ORDER_CREATED"

# Keys that must never be written into audit metadata, regardless of what a
# caller passes. Enforced here rather than trusted to reviewers.
FORBIDDEN_METADATA_KEYS = frozenset(
    {
        "api_key",
        "apikey",
        "authorization",
        "token",
        "access_token",
        "refresh_token",
        "password",
        "secret",
        "question",
        "answer",
        "prompt",
        "context",
        "database_url",
        "sql",
    }
)


def safe_metadata(**fields) -> dict:
    """Return audit metadata with sensitive keys removed.

    ``None`` values are dropped so the stored JSON stays minimal.
    """
    return {
        key: value
        for key, value in fields.items()
        if key.lower() not in FORBIDDEN_METADATA_KEYS and value is not None
    }


__all__ = [
    "AuditAction",
    "AI_ASSISTANT_ANSWERED",
    "AI_ASSISTANT_UNAUTHORIZED",
    "AI_ASSISTANT_FAILED",
    "AI_ASSISTANT_REJECTED",
    "AI_ASSISTANT_UNSUPPORTED",
    "AI_INSIGHTS_GENERATED",
    "AI_INSIGHTS_INSUFFICIENT",
    "AI_REPORT_GENERATED",
    "AI_REPORT_PARTIAL",
    "AI_REPORT_FAILED",
    "AI_REPORT_DENIED",
    "AI_FRAUD_SCANNED",
    "AI_FRAUD_FLAG_CREATED",
    "AI_FRAUD_FLAG_REVIEWED",
    "AI_WORKFLOW_RUN",
    "AI_WORKFLOW_EVENT_CREATED",
    "AI_WORKFLOW_EVENT_RESOLVED",
    "AI_CHATBOT_REQUEST",
    "AI_CHATBOT_ESCALATED",
    "AI_CHATBOT_UNAUTHORIZED",
    "AI_MACHINE_RISK_ASSESSED",
    "AI_MAINTENANCE_WORK_ORDER_CREATED",
    "ENTITY_ASSISTANT",
    "ENTITY_INSIGHTS",
    "ENTITY_REPORT",
    "ENTITY_FRAUD",
    "ENTITY_WORKFLOW",
    "ENTITY_CHATBOT",
    "ENTITY_MAINTENANCE",
    "safe_metadata",
]