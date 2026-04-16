"""In-memory TTL cache for expensive API endpoints.

Provides a simple decorator that caches function return values with
time-based expiration. Thread-safe for use with FastAPI's thread pool.

Usage:
    from cache import ttl_cache

    @ttl_cache(ttl_seconds=60)
    def expensive_query():
        ...

    # To invalidate:
    expensive_query.cache_clear()
"""
import threading
import time
from functools import wraps
from typing import Any, Callable


class _CacheEntry:
    __slots__ = ("value", "expires_at")

    def __init__(self, value: Any, expires_at: float) -> None:
        self.value = value
        self.expires_at = expires_at


_lock = threading.Lock()
_store: dict[str, _CacheEntry] = {}


def ttl_cache(ttl_seconds: int = 60, key_prefix: str = ""):
    """Decorator: cache the return value for `ttl_seconds`.

    The cache key is derived from the function name + arguments.
    Supports both sync and async functions (wraps sync only — for FastAPI
    sync endpoints running in the thread pool).

    Attributes added to the wrapped function:
        cache_clear() — remove all entries for this function
        cache_info()  — dict with hits, misses, size
    """
    def decorator(fn: Callable) -> Callable:
        prefix = key_prefix or fn.__qualname__
        _hits = 0
        _misses = 0

        @wraps(fn)
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            nonlocal _hits, _misses

            # Build a stable cache key from function name + args
            cache_key = f"{prefix}:{args}:{sorted(kwargs.items())}"
            now = time.monotonic()

            with _lock:
                entry = _store.get(cache_key)
                if entry and entry.expires_at > now:
                    _hits += 1
                    return entry.value

            # Cache miss — execute the function
            _misses += 1
            result = fn(*args, **kwargs)

            with _lock:
                _store[cache_key] = _CacheEntry(result, now + ttl_seconds)

            return result

        def cache_clear() -> None:
            """Remove all cache entries for this function."""
            with _lock:
                keys_to_remove = [k for k in _store if k.startswith(prefix)]
                for k in keys_to_remove:
                    del _store[k]

        def cache_info() -> dict[str, Any]:
            """Return cache statistics."""
            with _lock:
                size = sum(1 for k in _store if k.startswith(prefix))
            return {"hits": _hits, "misses": _misses, "size": size}

        wrapper.cache_clear = cache_clear  # type: ignore[attr-defined]
        wrapper.cache_info = cache_info    # type: ignore[attr-defined]
        return wrapper

    return decorator


def clear_all() -> None:
    """Nuclear option: clear the entire cache."""
    with _lock:
        _store.clear()
