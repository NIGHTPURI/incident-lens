import test from 'node:test';
import assert from 'node:assert/strict';
import { createCache } from './cache.mjs';

test('TTL expiry reloads source rather than returning stale data', () => {
  let now = 0, reads = 0;
  const cache = createCache({ ttlMs: 10, clock: () => now });
  const source = () => { reads++; return { id: 1, price: 1200 }; };
  assert.equal(cache.getOrLoad(1, source).price, 1200);
  assert.equal(cache.getOrLoad(1, source).price, 1200);
  assert.equal(reads, 1);
  now = 11;
  cache.getOrLoad(1, source);
  assert.equal(reads, 2);
  assert.deepEqual([cache.snapshot().hits, cache.snapshot().misses], [1, 2]);
});
