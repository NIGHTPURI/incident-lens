public record ProductView(int Id, int Price);

// Process-local TTL model, not Redis. A coarse lock coalesces misses in this process.
public sealed class ProductCache {
    private readonly object gate = new();
    private readonly Dictionary<int, (DateTimeOffset Expires, ProductView Value)> values = new();
    private readonly TimeSpan ttl;
    private readonly Func<DateTimeOffset> now;
    private int hits, misses;
    public ProductCache(TimeSpan? ttl = null, Func<DateTimeOffset>? now = null) {
        this.ttl = ttl ?? TimeSpan.FromSeconds(30);
        this.now = now ?? (() => DateTimeOffset.UtcNow);
    }
    public ProductView? GetOrLoad(int id, Func<ProductView?> loader) {
        lock (gate) {
            var time = now();
            if (values.TryGetValue(id, out var old) && old.Expires > time) { hits++; return old.Value; }
            misses++;
            var value = loader();
            if (value is not null) {
                if (values.Count >= 128) values.Remove(values.Keys.First());
                values[id] = (time + ttl, value);
            }
            return value;
        }
    }
    public object Snapshot() { lock (gate) return new { hits, misses, scope = "one process; not Redis" }; }
}
