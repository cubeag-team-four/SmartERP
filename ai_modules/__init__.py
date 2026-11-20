"""AI module: a permission-scoped Business Assistant over existing ERP data.

The layer has three deliberate boundaries:

* **The backend owns data access.** Intent routing, permission checks, period
  resolution and every query live here and in :mod:`app.modules.dashboard`.
* **The model only writes prose.** It receives a JSON context block and returns
  text. It never emits SQL, never names a table and never decides what the
  caller may see.
* **The provider is an abstraction.** :mod:`app.modules.ai.provider` is the only
  place that knows the upstream vendor or holds an API key.
"""