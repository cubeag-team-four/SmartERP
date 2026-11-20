"""Process-wide model registry: heavy models are loaded once and reused.

The sentiment transformer is several hundred MB; loading it per request would
cost seconds and memory each time. It is loaded lazily on first use behind a
lock (so two concurrent first requests do not load it twice) and then shared by
every request in the process. Nothing here is tenant-specific: a pretrained
model holds no tenant data.

Forecast models, by contrast, are fitted per series and are cheap; they are not
cached as model objects, but their *results* are memoised briefly by
:mod:`.forecasting` keyed on the exact input series.
"""

import importlib.util
import logging
import threading
from typing import TYPE_CHECKING, Any

from app.core.config import settings
from app.modules.ai.errors import AIError

if TYPE_CHECKING:
    from app.modules.ai.ml.sentiment import SentimentModel

logger = logging.getLogger(__name__)


class MLUnavailableException(AIError):
    """Local ML is disabled, a library is missing, or a model failed to load."""

    status_code = 503
    code = "ml_unavailable"


_lock = threading.Lock()
_sentiment: dict[str, "SentimentModel"] = {}
_load_errors: dict[str, str] = {}
_torch_configured = False


def library_available(name: str) -> bool:
    return importlib.util.find_spec(name) is not None


def require_enabled() -> None:
    if not settings.ML_ENABLED:
        raise MLUnavailableException("Machine-learning features are disabled on this server.")


def require_libraries(*names: str) -> None:
    missing = [name for name in names if not library_available(name)]
    if missing:
        # Package names only: never a path or an exception string.
        raise MLUnavailableException(
            "Machine-learning libraries are not installed on this server: "
            + ", ".join(sorted(missing))
        )


def configure_torch() -> Any:
    """Import torch once and bound its CPU threads so it cannot starve the API."""
    global _torch_configured
    import torch

    if not _torch_configured:
        torch.set_num_threads(settings.ML_TORCH_THREADS)
        _torch_configured = True
    return torch


def resolve_device() -> str:
    if settings.ML_DEVICE == "cpu":
        return "cpu"
    torch = configure_torch()
    if torch.cuda.is_available():
        return "cuda"
    if settings.ML_DEVICE == "cuda":
        logger.warning("ML_DEVICE=cuda but CUDA is not available; using CPU")
    return "cpu"


def sentiment_model_name(language: str) -> str:
    """The configured checkpoint for ``language``.

    One English model today. A multilingual deployment adds an entry here (or
    points this at an XLM-R sentiment checkpoint) without touching callers.
    """
    models = {"en": settings.ML_SENTIMENT_MODEL}
    return models[language]


def get_sentiment_model(language: str = "en") -> "SentimentModel":
    """The shared classifier for ``language``, loading it on first use."""
    require_enabled()
    require_libraries("torch", "transformers")
    name = sentiment_model_name(language)

    model = _sentiment.get(name)
    if model is not None:
        return model
    with _lock:
        model = _sentiment.get(name)
        if model is not None:
            return model
        from app.modules.ai.ml.sentiment import SentimentModel

        try:
            model = SentimentModel(
                name,
                device=resolve_device(),
                cache_dir=settings.ML_MODEL_CACHE_DIR or None,
                offline=settings.ML_OFFLINE,
            )
        except Exception as exc:  # noqa: BLE001 - any load failure is a 503
            # The full error (which may contain a cache path) goes to the log only.
            logger.exception("Sentiment model %s failed to load", name)
            _load_errors[name] = type(exc).__name__
            raise MLUnavailableException(
                "The sentiment model could not be loaded. If the server has no "
                "internet access, pre-download the model (see backend README)."
            ) from None
        _load_errors.pop(name, None)
        _sentiment[name] = model
        logger.info("Sentiment model %s loaded on %s", name, model.device)
        return model


def status() -> dict[str, Any]:
    """What is installed and loaded, for ``GET /ai/ml/status``. No paths, no secrets."""
    return {
        "enabled": settings.ML_ENABLED,
        "libraries": {
            name: library_available(name)
            for name in ("numpy", "sklearn", "scipy", "torch", "transformers")
        },
        "device": settings.ML_DEVICE,
        "sentiment_model": settings.ML_SENTIMENT_MODEL,
        "sentiment_model_loaded": settings.ML_SENTIMENT_MODEL in _sentiment,
        "sentiment_model_error": _load_errors.get(settings.ML_SENTIMENT_MODEL),
        "lstm_enabled": settings.ML_FORECAST_ENABLE_LSTM and library_available("torch"),
        "offline": settings.ML_OFFLINE,
    }


def preload() -> None:
    """Load the sentiment model now (e.g. from a deploy step), not on first request."""
    get_sentiment_model("en")


def main() -> None:  # pragma: no cover - manual entrypoint
    """``python -m app.modules.ai.ml.registry``: download/verify the model into the cache."""
    preload()
    print(f"Sentiment model ready: {settings.ML_SENTIMENT_MODEL}")


if __name__ == "__main__":  # pragma: no cover
    main()


__all__ = [
    "MLUnavailableException",
    "configure_torch",
    "get_sentiment_model",
    "preload",
    "require_enabled",
    "require_libraries",
    "status",
]
