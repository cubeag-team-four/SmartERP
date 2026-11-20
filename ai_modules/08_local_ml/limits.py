"""Request bounds for the ML endpoints, importable without numpy/sklearn.

The router validates query parameters with these before any ML library is
imported, so the API starts (and these endpoints answer a clean 503) on a host
where the ML dependencies are not installed.
"""

#: Pattern analysis history window, in days.
DEFAULT_LOOKBACK_DAYS = 180
MIN_LOOKBACK_DAYS = 30
MAX_LOOKBACK_DAYS = 730

#: Demand forecasting: products forecast when no ``product_id`` is given.
DEFAULT_TOP_PRODUCTS = 5
MAX_TOP_PRODUCTS = 10

#: Forecast horizons offered, in days.
HORIZONS = (7, 30, 90)
