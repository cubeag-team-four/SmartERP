"""Local machine-learning services: pattern analysis, forecasting, sentiment.

Everything in this package runs in-process. No external AI service is called:

* :mod:`.data` -- the only place that reads ERP rows. Every query is filtered
  by the caller's tenant and ``sales.order.view`` record scope in SQL.
* :mod:`.patterns` -- scikit-learn K-Means / Isolation Forest + statistics.
* :mod:`.forecasting` -- scikit-learn gradient boosting and an optional
  PyTorch LSTM, chosen per request by an out-of-sample backtest.
* :mod:`.sentiment` -- a pretrained Hugging Face classifier (PyTorch).
* :mod:`.registry` -- loads heavy models once per process and reuses them.

Route handlers live in :mod:`app.modules.ai.ml_router`; they validate input and
call these services, never a model directly. Heavy libraries (torch,
transformers) are imported lazily so the rest of the API starts without them.
"""
