"""AI provider abstraction and the Groq implementation.

The rest of the application talks to :class:`AIProvider`; only this module knows
that the upstream vendor is Groq, and only this module holds the API key.

Failure handling is deliberate. Everything that can go wrong between us and the
provider — a missing key, a timeout, a 4xx/5xx, a rate limit, an unparseable
body — is normalised into one of the :mod:`app.modules.ai.errors` types. The
key is used as an ``Authorization`` header and is never logged, echoed into an
exception message, or returned to the client.
"""

from __future__ import annotations

import logging
import math
import random
import time
from collections.abc import Callable
from datetime import UTC, datetime
from email.utils import parsedate_to_datetime
from typing import Protocol

import httpx

from app.common.money import localise_currency
from app.core.config import settings
from app.modules.ai.errors import (
    AIMalformedResponseException,
    AIProviderNotConfiguredException,
    AIProviderTimeoutException,
    AIProviderUnavailableException,
)

logger = logging.getLogger(__name__)

#: Ceiling on a returned answer. ``GROQ_MAX_OUTPUT_TOKENS`` bounds generation, but
#: that is a request we ask the provider to honour; this is what we enforce.
#: A model answer is rendered in a browser and stored in an audit column, so an
#: unbounded one is a denial-of-service vector against both.
MAX_ANSWER_CHARS = 8_000

#: Statuses worth another attempt (P3-19): request timeout, rate limiting and
#: server-side failures (5xx, see :func:`is_retryable_status`). Every other 4xx
#: means our request or credentials are wrong, which no retry can fix.
RETRYABLE_STATUS_CODES = frozenset({408, 429})


class _TransientProviderError(Exception):
    """Internal: one attempt failed in a way a later attempt may not.

    Carries the user-facing error to raise if no retry follows, and the
    provider's ``Retry-After`` (seconds) when it sent one.
    """

    def __init__(self, error: Exception, retry_after: float | None = None) -> None:
        super().__init__(type(error).__name__)
        self.error = error
        self.retry_after = retry_after


def is_retryable_status(status_code: int) -> bool:
    return status_code in RETRYABLE_STATUS_CODES or 500 <= status_code <= 599


def parse_retry_after(value: str | None, *, now: datetime | None = None) -> float | None:
    """Seconds from a ``Retry-After`` header (delta-seconds or HTTP-date), else ``None``."""
    if value is None or not value.strip():
        return None
    text = value.strip()
    try:
        seconds = float(text)
    except ValueError:
        try:
            when = parsedate_to_datetime(text)
        except (TypeError, ValueError, IndexError):
            return None
        if when.tzinfo is None:
            when = when.replace(tzinfo=UTC)
        seconds = (when - (now or datetime.now(UTC))).total_seconds()
    if not math.isfinite(seconds):
        return None
    return max(0.0, seconds)


def backoff_delay(attempt: int, base: float, cap: float, rng: Callable[[], float]) -> float:
    """Exponential backoff with full jitter before retry ``attempt`` (1-based)."""
    ceiling = min(cap, base * (2 ** (attempt - 1)))
    return max(0.0, ceiling * rng())


def normalise_answer(text: str) -> str:
    """Validate and bound a model answer before the application uses it.

    Model output is untrusted input too. It is displayed to a user and written to
    an audit column, so it is stripped of control characters (which can hide text
    from a reviewer reading a log or a rendered answer) and capped in length.

    It is *not* parsed as a query, a command or a value anywhere in this
    application. That is the property worth stating plainly: nothing an AI
    endpoint returns is ever used to authorise, commit or select anything, so the
    worst a hostile or malfunctioning model can do is produce misleading prose in
    a field a human reads. Normalising the string is a hygiene measure on top of
    that, not the thing making it safe.
    """
    cleaned = "".join(
        char
        for char in text
        if char in "\n\t" or not (ord(char) < 32 or 127 <= ord(char) <= 159)
    ).strip()
    # The model may write "$" even when told the currency; the amount is kept.
    cleaned = localise_currency(cleaned)
    if len(cleaned) > MAX_ANSWER_CHARS:
        cleaned = cleaned[:MAX_ANSWER_CHARS].rstrip() + "\n\n[Response truncated]"
    return cleaned


class AIProvider(Protocol):
    """Minimal contract the application depends on."""

    @property
    def model(self) -> str:
        """The configured model identifier, safe to display."""

    def is_configured(self) -> bool:
        """False when the provider cannot be called (no credentials)."""

    def complete(self, system_prompt: str, user_message: str) -> str:
        """Return the model's plain-text answer, or raise an :class:`AIError`."""


class GroqProvider:
    """Chat-completion client for Groq's OpenAI-compatible endpoint."""

    def __init__(
        self,
        *,
        api_key: str | None = None,
        model: str | None = None,
        base_url: str | None = None,
        timeout: float | None = None,
        max_output_tokens: int | None = None,
        temperature: float | None = None,
        max_attempts: int | None = None,
        transport: httpx.BaseTransport | None = None,
        sleep: Callable[[float], None] = time.sleep,
        clock: Callable[[], float] = time.monotonic,
        rng: Callable[[], float] = random.random,
    ) -> None:
        # ``GROQ_API_KEY`` is a SecretStr, so the raw value is unwrapped exactly
        # once, here, and never stored anywhere it could be logged.
        if api_key is None and settings.GROQ_API_KEY is not None:
            api_key = settings.GROQ_API_KEY.get_secret_value()
        self._api_key = (api_key or "").strip()
        self._model = model or settings.GROQ_MODEL
        self._base_url = (base_url or settings.GROQ_BASE_URL).rstrip("/")
        self._timeout = settings.GROQ_TIMEOUT_SECONDS if timeout is None else timeout
        self._max_tokens = (
            settings.GROQ_MAX_OUTPUT_TOKENS if max_output_tokens is None else max_output_tokens
        )
        self._temperature = settings.GROQ_TEMPERATURE if temperature is None else temperature
        # P3-19 retry policy. ``transport``, ``sleep``, ``clock`` and ``rng`` are
        # injectable so tests neither touch the network nor actually wait.
        self._max_attempts = max(
            1, settings.AI_RETRY_MAX_ATTEMPTS if max_attempts is None else max_attempts
        )
        self._transport = transport
        self._sleep = sleep
        self._clock = clock
        self._rng = rng

    @property
    def model(self) -> str:
        return self._model

    def is_configured(self) -> bool:
        return bool(self._api_key)

    def _require_key(self) -> None:
        if not self._api_key:
            # The message deliberately names neither the variable nor the value.
            raise AIProviderNotConfiguredException(
                "The AI assistant is not configured on this server."
            )

    def complete(self, system_prompt: str, user_message: str) -> str:
        """Call the provider and return its answer, retrying transient failures.

        P3-19: a timeout or connection failure before any response, or a
        408/429/5xx status, is retried with exponential backoff and full jitter,
        up to ``AI_RETRY_MAX_ATTEMPTS`` calls in total and within
        ``AI_RETRY_MAX_TOTAL_SECONDS``. A 429's ``Retry-After`` is honoured when it
        is no longer than ``AI_RETRY_AFTER_MAX_SECONDS`` and fits the remaining
        budget; otherwise the request fails at once. Nothing else is retried:
        not another 4xx, and not a response that arrived (in full or in part)
        but could not be read, since the provider has already done the work.
        When retries are exhausted the last attempt's error is raised, so the
        caller sees exactly the error types it saw before.
        """
        self._require_key()

        payload = {
            "model": self._model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message},
            ],
            "temperature": self._temperature,
            "max_tokens": self._max_tokens,
        }

        started = self._clock()
        budget = settings.AI_RETRY_MAX_TOTAL_SECONDS
        attempt = 1
        while True:
            timeout = self._timeout
            if attempt > 1:
                # A retry never runs past the overall budget.
                timeout = min(timeout, max(0.001, budget - (self._clock() - started)))
            try:
                return self._attempt(payload, timeout)
            except _TransientProviderError as failure:
                if attempt >= self._max_attempts:
                    raise failure.error from None
                delay = backoff_delay(
                    attempt,
                    settings.AI_RETRY_BASE_DELAY_SECONDS,
                    settings.AI_RETRY_MAX_DELAY_SECONDS,
                    self._rng,
                )
                if failure.retry_after is not None:
                    if failure.retry_after > settings.AI_RETRY_AFTER_MAX_SECONDS:
                        raise failure.error from None
                    delay = max(delay, failure.retry_after)
                if (self._clock() - started) + delay >= budget:
                    raise failure.error from None
                logger.info(
                    "Retrying AI provider call (attempt %s of %s) in %.2fs",
                    attempt + 1,
                    self._max_attempts,
                    delay,
                )
                self._sleep(delay)
                attempt += 1

    def _attempt(self, payload: dict, timeout: float) -> str:
        """One call. A transient failure raises :class:`_TransientProviderError`."""
        try:
            with httpx.Client(timeout=timeout, transport=self._transport) as client:
                with client.stream(
                    "POST",
                    f"{self._base_url}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self._api_key}",
                        "Content-Type": "application/json",
                    },
                    json=payload,
                ) as response:
                    # A response exists from here on: a failure while reading its
                    # body is a partial response and is never retried.
                    try:
                        response.read()
                    except httpx.TimeoutException as exc:
                        logger.warning("AI provider response timed out mid-body")
                        raise AIProviderTimeoutException(
                            "The AI assistant took too long to respond. Please try again."
                        ) from exc
                    except httpx.HTTPError as exc:
                        logger.warning(
                            "AI provider response failed mid-body: %s", type(exc).__name__
                        )
                        raise AIProviderUnavailableException(
                            "The AI assistant is temporarily unavailable. Please try again shortly."
                        ) from exc
        except httpx.TimeoutException as exc:
            # Logged without headers or payload so the key cannot leak.
            logger.warning("AI provider request timed out")
            raise _TransientProviderError(
                AIProviderTimeoutException(
                    "The AI assistant took too long to respond. Please try again."
                )
            ) from exc
        except httpx.HTTPError as exc:
            logger.warning("AI provider request failed: %s", type(exc).__name__)
            raise _TransientProviderError(
                AIProviderUnavailableException(
                    "The AI assistant is temporarily unavailable. Please try again shortly."
                )
            ) from exc

        try:
            self._raise_for_status(response.status_code)
        except AIProviderUnavailableException as exc:
            if not is_retryable_status(response.status_code):
                raise
            retry_after = (
                parse_retry_after(response.headers.get("Retry-After"))
                if response.status_code == 429
                else None
            )
            raise _TransientProviderError(exc, retry_after) from None
        return self._read_text(response)

    def _raise_for_status(self, status_code: int) -> None:
            """Translate an HTTP status into a clean, detail-free error."""
            if status_code < 400:
                return

            # 429 is rate limiting; 5xx is the provider having a bad day. Both are
            # transient, so both surface as "temporarily unavailable".
            if status_code in (408, 429) or status_code >= 500:
                logger.warning("AI provider returned status %s", status_code)
                raise AIProviderUnavailableException(
                    "The AI assistant is temporarily unavailable. Please try again shortly."
                )

            # 401/403 means our credentials were rejected and other 4xx means the
            # request was malformed. Neither is recoverable by the end user, and
            # neither may echo provider text back to them.
            logger.warning("AI provider rejected the request with status %s", status_code)
            raise AIProviderUnavailableException(
                "The AI assistant is temporarily unavailable. Please try again shortly."
            )

    def _read_text(self, response: httpx.Response) -> str:
        """Extract the assistant message, rejecting anything unusable."""
        try:
            body = response.json()
        except ValueError as exc:
            logger.warning("AI provider returned a non-JSON body")
            raise AIMalformedResponseException(
                "The AI assistant returned an unreadable response. Please try again."
            ) from exc

        try:
            content = body["choices"][0]["message"]["content"]
        except (KeyError, IndexError, TypeError) as exc:
            logger.warning("AI provider response did not contain a completion")
            raise AIMalformedResponseException(
                "The AI assistant returned an unreadable response. Please try again."
            ) from exc

        if not isinstance(content, str) or not content.strip():
            logger.warning("AI provider returned an empty completion")
            raise AIMalformedResponseException(
                "The AI assistant returned an unreadable response. Please try again."
            )

        return normalise_answer(content)


_provider: AIProvider | None = None


def get_provider() -> AIProvider:
    """Return the process-wide provider instance.

    Tests replace this at the service boundary via :func:`set_provider`, so no
    test ever performs a network call.
    """
    global _provider
    if _provider is None:
        _provider = GroqProvider()
    return _provider


def set_provider(provider: AIProvider | None) -> None:
    """Override the provider (tests, or a future alternative vendor)."""
    global _provider
    _provider = provider
