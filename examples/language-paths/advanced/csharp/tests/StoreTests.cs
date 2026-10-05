using Xunit;

public class StoreTests {
    [Fact]
    public void ExerciseTokensResolveIdentityButDoNotIssueOrVerifyJwt() {
        var identity = new PracticeIdentity("local-alice-token-very-long-only-for-tests", "local-bob-token-very-long-only-for-tests");
        Assert.Null(identity.Resolve(""));
        Assert.Null(identity.Resolve("Bearer unknown"));
        Assert.Equal("alice", identity.Resolve("Bearer local-alice-token-very-long-only-for-tests"));
        Assert.Equal("bob", identity.Resolve("Bearer local-bob-token-very-long-only-for-tests"));
    }
    [Fact]
    public void LocalCacheExpiresAndReloads() {
        var now = DateTimeOffset.UnixEpoch;
        var cache = new ProductCache(TimeSpan.FromSeconds(10), () => now);
        var reads = 0;
        ProductView Source() { reads++; return new ProductView(1, 1200); }
        Assert.Equal(1200, cache.GetOrLoad(1, Source)!.Price);
        Assert.Equal(1200, cache.GetOrLoad(1, Source)!.Price);
        Assert.Equal(1, reads);
        now = now.AddSeconds(11);
        cache.GetOrLoad(1, Source);
        Assert.Equal(2, reads);
    }
    [Fact]
    public void TransactionReplayAndDeferredWork() {
        var path = Path.Combine(Path.GetTempPath(), $"catalog-advanced-{Guid.NewGuid()}.db");
        try {
            var store = new Store(path);
            Assert.Throws<InvalidOperationException>(() => store.Create("alice", "fail", new OrderInput(1, 2), true));
            Assert.Null(store.Find(1)); Assert.Equal(0, store.Pending());
            var (status, body) = store.Create("alice", "key-1", new OrderInput(1, 2));
            Assert.Equal(201, status);
            var order = Assert.IsType<OrderView>(body);
            Assert.Equal("accepted", order.Status);
            Assert.Equal(200, store.Create("alice", "key-1", new OrderInput(1, 2)).Status);
            Assert.Equal(409, store.Create("alice", "key-1", new OrderInput(1, 3)).Status);
            Assert.Equal(201, store.Create("bob", "key-1", new OrderInput(1, 2)).Status);
            var reopened = new Store(path);
            Assert.Equal("alice", reopened.Find(order.Id)!.Owner);
            Assert.True(reopened.ProcessOne());
            Assert.Equal("fulfilled", reopened.Find(order.Id)!.Order.Status);
        } finally { File.Delete(path); }
    }
}
