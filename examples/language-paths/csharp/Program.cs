// Loopback-only, in-memory catalog/order learning API; not production security.
var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();
var gate = new object();
var orders = new Dictionary<int, Order>();
var keys = new Dictionary<string, Claim>();

app.MapGet("/health", () => Results.Json(new { status = "up" }));
app.MapGet("/products/{id:int}", (int id) => id == 1
    ? Results.Json(new { id = 1, price = 1200 })
    : Results.Json(new { error = "product not found" }, statusCode: 404));
app.MapGet("/orders/{id:int}", (int id) => {
    lock (gate) {
        return orders.TryGetValue(id, out var order)
            ? Results.Json(order)
            : Results.Json(new { error = "order not found" }, statusCode: 404);
    }
});
app.MapPost("/orders", (HttpContext context, Input input) => {
    var key = context.Request.Headers["Idempotency-Key"].ToString();
    if (string.IsNullOrWhiteSpace(key)) return Results.Json(new { error = "Idempotency-Key required" }, statusCode: 400);
    if (input.ProductId != 1) return Results.Json(new { error = "product not found" }, statusCode: 404);
    if (input.Quantity is < 1 or > 100) return Results.Json(new { error = "quantity must be 1..100" }, statusCode: 400);
    lock (gate) {
        if (keys.TryGetValue(key, out var previous)) {
            return previous.Input == input
                ? Results.Json(orders[previous.Id])
                : Results.Json(new { error = "key reused for different order" }, statusCode: 409);
        }
        var id = orders.Count + 1;
        var order = new Order(id, input.ProductId, input.Quantity, 1200 * input.Quantity, "accepted");
        orders.Add(id, order);
        keys.Add(key, new Claim(input, id));
        return Results.Json(order, statusCode: 201);
    }
});

var port = Environment.GetEnvironmentVariable("PORT") ?? "18182";
app.Run($"http://127.0.0.1:{port}");

record Input(int ProductId, int Quantity);
record Order(int Id, int ProductId, int Quantity, int Total, string Status);
record Claim(Input Input, int Id);
