"""Bounded process-local TTL model; this is not Redis."""
import time
from threading import Lock


class Cache:
    def __init__(self, ttl_seconds=30, max_entries=128, clock=time.monotonic):
        self.ttl = ttl_seconds
        self.limit = max_entries
        self.clock = clock
        self.values = {}
        self.lock = Lock()
        self.hits = 0
        self.misses = 0

    def get_or_load(self, key, loader):
        with self.lock:
            now = self.clock()
            old = self.values.get(key)
            if old and old[0] > now:
                self.hits += 1
                return old[1]
            self.misses += 1
            value = loader()
            if value is not None:
                if len(self.values) >= self.limit:
                    self.values.pop(next(iter(self.values)))
                self.values[key] = (now + self.ttl, value)
            return value

    def snapshot(self):
        with self.lock:
            return {"hits": self.hits, "misses": self.misses, "scope": "one process; not Redis"}
