using System.Diagnostics;
using System.Text.Json;

var store = new Store(Environment.GetEnvironmentVariable("PRACTICE_DB") ?? "practice.db");
if (args.Length > 0 && args[0] == "worker") {
    using var stopped = new CancellationTokenSource();
    Console.CancelKeyPress += (_, e) => { e.Cancel = true; stopped.Cancel(); };
    using var terminate = OperatingSystem.IsWindows() ? null : System.Runtime.InteropServices.PosixSignalRegistration.Create(System.Runtime.InteropServices.PosixSignal.SIGTERM, ctx => { ctx.Cancel = true; stopped.Cancel(); });
    Console.WriteLine("{\"event\":\"worker_ready\"}");
    while (!stopped.IsCancellationRequested) {
        try { store.ProcessOne(); }
        catch (Exception error) { Console.Error.WriteLine(JsonSerializer.Serialize(new { @event = "worker_error", type = error.GetType().Name })); }
        try { await Task.Delay(1000, stopped.Token); } catch (OperationCanceledException) { break; }
    }
    return;
}

var alice = Environment.GetEnvironmentVariable("PRACTICE_ALICE_TOKEN") ?? "";
var bob = Environment.GetEnvironmentVariable("PRACTICE_BOB_TOKEN") ?? "";
var identity = new PracticeIdentity(alice, bob);
var builder = WebApplication.CreateBuilder();
var app = builder.Build();
long requests = 0, errors = 0, elapsedTicks = 0;
var cache = new ProductCache();

string? Actor(HttpContext context) => identity.Resolve(context.Request.Headers.Authorization.ToString());

app.Use(async (context, next) => {
    var id = Guid.NewGuid().ToString();
    context.Response.Headers["X-Request-Id"] = id;
    var started = Stopwatch.GetTimestamp();
    try { await next(context); }
    finally {
        var elapsed = Stopwatch.GetTimestamp() - started;
        Interlocked.Increment(ref requests);
        if (context.Response.StatusCode >= 400) Interlocked.Increment(ref errors);
        Interlocked.Add(ref elapsedTicks, elapsed);
        Console.WriteLine(JsonSerializer.Serialize(new { requestId = id, path = context.Request.Path.Value, status = context.Response.StatusCode, elapsedMs = Stopwatch.GetElapsedTime(started).TotalMilliseconds }));
    }
});

app.MapGet("/health", () => Results.Json(new { status = "up" }));
app.MapGet("/products/{id:int}", (int id) => {
    var product = cache.GetOrLoad(id, () => store.Product(id));
    return product is null ? Results.Json(new { error = "product not found" }, statusCode: 404) : Results.Json(product);
});
app.MapPost("/orders", (HttpContext context, OrderInput input) => {
    var owner = Actor(context);
    if (owner is null) return Results.Json(new { error = "bearer token required or invalid" }, statusCode: 401);
    var key = context.Request.Headers["Idempotency-Key"].ToString();
    var (status, body) = store.Create(owner, key, input, requestId: context.Response.Headers["X-Request-Id"].ToString());
    return Results.Json(body, statusCode: status);
});
app.MapGet("/orders/{id:long}", (HttpContext context, long id) => {
    var owner = Actor(context);
    if (owner is null) return Results.Json(new { error = "bearer token required or invalid" }, statusCode: 401);
    var found = store.Find(id);
    if (found is null) return Results.Json(new { error = "order not found" }, statusCode: 404);
    return found.Owner == owner ? Results.Json(found.Order) : Results.Json(new { error = "order access denied" }, statusCode: 403);
});
app.MapGet("/metrics", (HttpContext context) => Actor(context) is null
    ? Results.Json(new { error = "bearer token required or invalid" }, statusCode: 401)
    : Results.Json(new { requests = Interlocked.Read(ref requests), errors = Interlocked.Read(ref errors), durationMsSum = Interlocked.Read(ref elapsedTicks) * 1000.0 / Stopwatch.Frequency, cache = cache.Snapshot(), outboxPending = store.Pending(), scope = "one API process; not Prometheus" }));

var port = Environment.GetEnvironmentVariable("PORT") ?? "18183";
app.Run($"http://127.0.0.1:{port}");
