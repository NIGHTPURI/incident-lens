// Bounded process-local TTL model, not Redis.
export function createCache({ ttlMs = 30000, limit = 128, clock = () => performance.now() } = {}) {
  const values = new Map();
  let hits = 0, misses = 0;
  return {
    getOrLoad(key, loader) {
      const now = clock();
      const old = values.get(key);
      if (old && old.expiresAt > now) { hits++; return old.value; }
      misses++;
      const value = loader();
      if (value != null) {
        if (values.size >= limit) values.delete(values.keys().next().value);
        values.set(key, { expiresAt: now + ttlMs, value });
      }
      return value;
    },
    snapshot: () => ({ hits, misses, scope: 'one process; not Redis' }),
  };
}
