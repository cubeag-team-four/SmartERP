"""Review sentiment: pretrained transformer inference plus topic extraction.

Pure inference and text analytics; no database access (persistence lives in
:mod:`.sentiment_service`). The classifier is constructed once per process by
:func:`app.modules.ai.ml.registry.get_sentiment_model`.

Model
-----
Default checkpoint: ``cardiffnlp/twitter-roberta-base-sentiment-latest``
(RoBERTa-base fine-tuned on ~124M tweets and the TweetEval benchmark, three
classes: negative / neutral / positive). It suits short, informal customer
reviews and gives a real neutral class rather than a thresholded one. Any
sequence-classification checkpoint works through ``ML_SENTIMENT_MODEL``: label
names are normalised below (``negative``/``LABEL_0``/``1 star``...), and a
two-class model derives NEUTRAL from low confidence.

Topics
------
Frequent positive/negative topics are the uni- and bi-grams that occur in at
least two reviews of a class *more often than in the other classes*
(document-frequency difference), so words common to every review ("product",
"order") never surface as a "complaint". Recurring complaints group negative
reviews by a small, explainable aspect lexicon (delivery, quality, price...).
"""

import html
import re
import threading
import unicodedata
from collections.abc import Sequence
from typing import Any

from app.models.review_analysis import SENTIMENT_LABELS

POSITIVE, NEUTRAL, NEGATIVE = "POSITIVE", "NEUTRAL", "NEGATIVE"

#: Characters kept per review before tokenisation (the tokenizer truncates at the
#: model's token limit anyway; this bounds the work done to get there).
MAX_REVIEW_CHARS = 5000
#: Token limit passed to the tokenizer.
MAX_TOKENS = 512
#: Two-class models: a top probability below this is reported as NEUTRAL.
BINARY_NEUTRAL_THRESHOLD = 0.65

_TAG = re.compile(r"<[^>]+>")
_URL = re.compile(r"(https?://|www\.)\S+", re.IGNORECASE)
_HANDLE = re.compile(r"@\w+")
_SPACE = re.compile(r"\s+")


def clean_review(text: str) -> str:
    """Normalise one review for the model: NFKC, no HTML/URLs, single spaces.

    URLs and @handles are replaced by the placeholders the default model was
    trained with (``http`` / ``@user``), so they neither leak into topics nor
    confuse the classifier.
    """
    text = unicodedata.normalize("NFKC", html.unescape(text or ""))
    text = _TAG.sub(" ", text)
    text = _URL.sub("http", text)
    text = _HANDLE.sub("@user", text)
    return _SPACE.sub(" ", text).strip()[:MAX_REVIEW_CHARS]


def _canonical_label(raw: str, index: int, n_labels: int) -> str:
    """Map a checkpoint's label name to POSITIVE / NEUTRAL / NEGATIVE."""
    name = str(raw).strip().lower()
    if "neg" in name:
        return NEGATIVE
    if "neu" in name:
        return NEUTRAL
    if "pos" in name:
        return POSITIVE
    star = re.match(r"^(\d)\s*star", name)
    if star:  # e.g. nlptown/bert-base-multilingual-uncased-sentiment
        stars = int(star.group(1))
        return NEGATIVE if stars <= 2 else NEUTRAL if stars == 3 else POSITIVE
    # Generic LABEL_n: ordered negative -> positive by convention.
    if n_labels == 2:
        return (NEGATIVE, POSITIVE)[index]
    if n_labels == 3:
        return (NEGATIVE, NEUTRAL, POSITIVE)[index]
    raise ValueError(f"Cannot interpret sentiment label {raw!r}")


class SentimentModel:
    """A loaded tokenizer + classifier, safe to share across request threads."""

    def __init__(
        self, model_name: str, *, device: str, cache_dir: str | None, offline: bool
    ) -> None:
        from transformers import AutoModelForSequenceClassification, AutoTokenizer

        from app.modules.ai.ml.registry import configure_torch

        self._torch = configure_torch()
        kwargs: dict[str, Any] = {"cache_dir": cache_dir, "local_files_only": offline}
        self.name = model_name
        self.device = device
        self.tokenizer = AutoTokenizer.from_pretrained(model_name, **kwargs)
        self.model = AutoModelForSequenceClassification.from_pretrained(model_name, **kwargs)
        self.model.to(device)
        self.model.eval()

        id2label = self.model.config.id2label
        n_labels = len(id2label)
        self._labels = [_canonical_label(id2label[i], i, n_labels) for i in range(n_labels)]
        self._binary = NEUTRAL not in self._labels
        self._max_tokens = min(int(getattr(self.tokenizer, "model_max_length", MAX_TOKENS)),
                               MAX_TOKENS)
        # Inference is serialised: it bounds peak memory to one batch per
        # process and avoids relying on tokenizer thread-safety.
        self._lock = threading.Lock()

    def predict(self, texts: Sequence[str], batch_size: int) -> list[dict[str, float]]:
        """Class probabilities per text, ``{"POSITIVE": p, "NEUTRAL": p, "NEGATIVE": p}``."""
        torch = self._torch
        out: list[dict[str, float]] = []
        with self._lock, torch.inference_mode():
            for start in range(0, len(texts), batch_size):
                batch = list(texts[start:start + batch_size])
                encoded = self.tokenizer(
                    batch, padding=True, truncation=True,
                    max_length=self._max_tokens, return_tensors="pt",
                ).to(self.device)
                probs = torch.softmax(self.model(**encoded).logits, dim=-1).cpu().tolist()
                for row in probs:
                    scores = dict.fromkeys(SENTIMENT_LABELS, 0.0)
                    for label, p in zip(self._labels, row):
                        scores[label] += float(p)
                    out.append(scores)
        return out

    def label(self, scores: dict[str, float]) -> tuple[str, float]:
        """The winning label and its probability."""
        best = max(scores, key=scores.__getitem__)
        if self._binary and scores[best] < BINARY_NEUTRAL_THRESHOLD:
            return NEUTRAL, scores[best]
        return best, scores[best]


# ------------------------------------------------------------------ topics

#: Words carrying no topic in a review context, on top of sklearn's list.
_DOMAIN_STOP_WORDS = {
    "product", "products", "item", "items", "order", "ordered", "buy", "bought",
    "purchase", "purchased", "got", "get", "really", "just", "im", "ive", "dont",
    "did", "does", "would", "also", "one", "use", "used", "using", "thing",
    "http", "user", "lot", "bit", "time", "times",
}
_NEGATIONS = {"not", "no", "never", "nothing", "nor", "cannot"}

#: Aspect lexicon for recurring complaints. Patterns are word-prefix regexes.
COMPLAINT_ASPECTS: dict[str, tuple[str, ...]] = {
    "Delivery & shipping": (r"deliver", r"shipp", r"late\b", r"delay", r"courier",
                            r"arriv", r"dispatch", r"transit"),
    "Product quality": (r"quality", r"broke", r"defect", r"damag", r"faulty", r"flimsy",
                        r"cheap(ly)?\b", r"stopped working", r"not working", r"poor"),
    "Price & value": (r"price", r"expensive", r"overpriced", r"costly", r"value for money",
                      r"worth"),
    "Customer service": (r"support", r"customer service", r"staff", r"rude", r"respon",
                         r"unhelpful", r"no one", r"helpline", r"call(ed)? back"),
    "Returns & refunds": (r"refund", r"return", r"replace", r"exchange", r"money back"),
    "Packaging": (r"packag", r"packing", r"packed", r"box\b", r"seal"),
    "Order accuracy": (r"wrong", r"missing", r"incorrect", r"different (item|product|colou?r|size)",
                       r"not as described"),
    "Billing & invoicing": (r"invoice", r"billing", r"bill\b", r"overcharg", r"charged",
                            r"payment"),
}
_ASPECT_PATTERNS = {
    aspect: re.compile("|".join(rf"\b{p}" for p in patterns), re.IGNORECASE)
    for aspect, patterns in COMPLAINT_ASPECTS.items()
}

TOP_TOPICS = 10
MIN_TOPIC_MENTIONS = 2
EXCERPT_CHARS = 160


def _stop_words() -> list[str]:
    from sklearn.feature_extraction.text import ENGLISH_STOP_WORDS

    return sorted((set(ENGLISH_STOP_WORDS) - _NEGATIONS) | _DOMAIN_STOP_WORDS)


def extract_topics(texts: Sequence[str], labels: Sequence[str]) -> dict[str, list[dict]]:
    """Distinctive frequent terms per sentiment class.

    Returns ``{"POSITIVE": [...], "NEGATIVE": [...]}``; each item is
    ``{"term", "mentions", "share"}`` where ``share`` is the fraction of that
    class's reviews mentioning the term. Empty lists when there is too little
    text to say anything.
    """
    result: dict[str, list[dict]] = {POSITIVE: [], NEGATIVE: []}
    if len(texts) < 2:
        return result

    import numpy as np
    from sklearn.feature_extraction.text import CountVectorizer

    vectorizer = CountVectorizer(
        ngram_range=(1, 2), stop_words=_stop_words(), binary=True,
        token_pattern=r"(?u)\b[a-zA-Z][a-zA-Z]+\b", max_features=20000,
    )
    try:
        matrix = vectorizer.fit_transform(texts)
    except ValueError:  # only stop words / no tokens at all
        return result
    terms = vectorizer.get_feature_names_out()
    labels_arr = np.asarray(labels)

    for label in (POSITIVE, NEGATIVE):
        in_group = labels_arr == label
        n_group, n_other = int(in_group.sum()), int((~in_group).sum())
        if n_group == 0:
            continue
        df_group = np.asarray(matrix[in_group].sum(axis=0)).ravel()
        df_other = (
            np.asarray(matrix[~in_group].sum(axis=0)).ravel() if n_other else np.zeros_like(df_group)
        )
        share = df_group / n_group
        distinct = share - (df_other / n_other if n_other else 0)

        candidates = [
            i for i in np.argsort(-df_group * 1000 - distinct)
            if df_group[i] >= MIN_TOPIC_MENTIONS and distinct[i] > 0
            and terms[i] not in _NEGATIONS
        ]
        chosen: list[int] = []
        for i in candidates:
            term = terms[i]
            # Skip a unigram already covered by a chosen bigram of similar reach,
            # and a bigram that only repeats a stronger chosen unigram.
            if any(
                (" " in terms[j] and term in terms[j].split() and df_group[j] >= 0.8 * df_group[i])
                for j in chosen
            ):
                continue
            chosen.append(i)
            if len(chosen) == TOP_TOPICS:
                break
        result[label] = [
            {"term": str(terms[i]), "mentions": int(df_group[i]), "share": round(float(share[i]), 4)}
            for i in chosen
        ]
    return result


def recurring_complaints(texts: Sequence[str], labels: Sequence[str]) -> list[dict]:
    """Complaint aspects raised by two or more negative reviews, most frequent first."""
    negatives = [text for text, label in zip(texts, labels) if label == NEGATIVE]
    if not negatives:
        return []
    found = []
    for aspect, pattern in _ASPECT_PATTERNS.items():
        hits = [text for text in negatives if pattern.search(text)]
        if len(hits) >= MIN_TOPIC_MENTIONS:
            found.append({
                "aspect": aspect,
                "mentions": len(hits),
                "share_of_negative": round(len(hits) / len(negatives), 4),
                "examples": [_excerpt(text) for text in hits[:2]],
            })
    return sorted(found, key=lambda item: -item["mentions"])


def _excerpt(text: str) -> str:
    return text if len(text) <= EXCERPT_CHARS else text[:EXCERPT_CHARS - 1].rstrip() + "…"


__all__ = [
    "NEGATIVE",
    "NEUTRAL",
    "POSITIVE",
    "SentimentModel",
    "clean_review",
    "extract_topics",
    "recurring_complaints",
]
