import unittest
from cache import Cache


class CacheTests(unittest.TestCase):
    def test_ttl_and_source_reads(self):
        now = [0]
        reads = []
        cache = Cache(ttl_seconds=10, clock=lambda: now[0])
        def source():
            reads.append(1)
            return {"id": 1, "price": 1200}
        self.assertEqual(cache.get_or_load(1, source)["price"], 1200)
        self.assertEqual(cache.get_or_load(1, source)["price"], 1200)
        self.assertEqual(len(reads), 1)
        now[0] = 11
        cache.get_or_load(1, source)
        self.assertEqual(len(reads), 2)
        self.assertEqual((cache.snapshot()["hits"], cache.snapshot()["misses"]), (1, 2))
