"""AI-specific errors, safe to return to a client.

Every message here is written for an end user: it names the failure class and
nothing else. Provider credentials, raw exception text, request URLs and stack
traces never reach this layer — the provider converts them into these types
before they propagate.

All of them extend :class:`AppException`, so the existing exception handler in
``app.main`` renders them as the standard ``{"success": false, "error": {...}}``
envelope without any AI-specific plumbing.
"""

from app.common.exceptions import AppException


class AIError(AppException):
    """Base class for AI failures."""

    status_code = 500
    code = "ai_error"


class AIProviderNotConfiguredException(AIError):
    """No provider API key is configured on the server."""

    status_code = 503
    code = "ai_not_configured"


class AIProviderUnavailableException(AIError):
    """The upstream provider is unreachable, erroring, or rate limiting."""

    status_code = 503
    code = "ai_provider_unavailable"


class AIProviderTimeoutException(AIError):
    """The upstream provider did not answer within the configured timeout."""

    status_code = 504
    code = "ai_provider_timeout"


class AIMalformedResponseException(AIError):
    """The provider answered, but not with usable text."""

    status_code = 502
    code = "ai_malformed_response"


# Deliberately vague, identical for both cases, and free of any provider detail.
UNSUPPORTED_INTENT_MESSAGE = (
    "I can currently answer questions about sales, purchases, inventory, "
    "finance, receivables, CRM, approvals, and overall business summaries."
)

MISSING_KEY_MESSAGE = (
    "The AI assistant is not configured on this server. "
    "Please contact your administrator."
)

PROVIDER_UNAVAILABLE_MESSAGE = (
    "The AI assistant is temporarily unavailable. Please try again shortly."
)

PROVIDER_TIMEOUT_MESSAGE = (
    "The AI assistant took too long to respond. Please try again."
)

MALFORMED_RESPONSE_MESSAGE = (
    "The AI assistant returned an unreadable response. Please try again."
)