using System.Security.Cryptography;
using System.Text;
using Microsoft.Data.Sqlite;

public record OrderInput(int ProductId, int Quantity);
public record OrderView(long Id, int ProductId, int Quantity, int Total, string Status);
public record OwnedOrder(string Owner, OrderView Order);

public sealed class Store {
    private readonly string connectionString;
    public Store(string path) {
        connectionString = new SqliteConnectionStringBuilder { DataSource = path, Mode = SqliteOpenMode.ReadWriteCreate, DefaultTimeout = 5 }.ToString();
        using var db = Open();
        using var schema = Command(db, null, File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "schema.sql")));
        schema.ExecuteNonQuery();
    }
    private SqliteConnection Open() {
        var db = new SqliteConnection(connectionString);
        db.Open();
        using var pragma = Command(db, null, "PRAGMA foreign_keys = ON");
        pragma.ExecuteNonQuery();
        return db;
    }
    private static SqliteCommand Command(SqliteConnection db, SqliteTransaction? tx, string sql, params (string, object)[] values) {
        var command = db.CreateCommand();
        command.CommandText = sql;
        command.Transaction = tx;
        foreach (var (name, value) in values) command.Parameters.AddWithValue(name, value);
        return command;
    }
    private static OrderView ReadOrder(SqliteDataReader row) => new(row.GetInt64(0), row.GetInt32(1), row.GetInt32(2), row.GetInt32(3), row.GetString(4));
    public (int Status, object Body) Create(string owner, string key, OrderInput input, bool failAfterOrder = false, string? requestId = null) {
        if (string.IsNullOrWhiteSpace(key) || key.Length > 128) return (400, new { error = "Idempotency-Key required (max 128 characters)" });
        if (input.ProductId != 1) return (404, new { error = "product not found" });
        if (input.Quantity is < 1 or > 100) return (400, new { error = "quantity must be 1..100" });
        var hash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes($"{input.ProductId}:{input.Quantity}")));
        using var db = Open();
        using var tx = db.BeginTransaction();
        using (var lookup = Command(db, tx, "SELECT id,product_id,quantity,total,status,request_hash FROM orders WHERE owner=$owner AND idempotency_key=$key", ("$owner", owner), ("$key", key))) {
            using var row = lookup.ExecuteReader();
            if (row.Read()) {
                var existing = ReadOrder(row);
                var oldHash = row.GetString(5);
                row.Close();
                tx.Commit();
                return oldHash == hash ? (200, existing) : (409, new { error = "key reused for different order" });
            }
        }
        using (var insert = Command(db, tx, "INSERT INTO orders(owner,idempotency_key,request_hash,product_id,quantity,total,status) VALUES($owner,$key,$hash,1,$qty,$total,'accepted')", ("$owner", owner), ("$key", key), ("$hash", hash), ("$qty", input.Quantity), ("$total", 1200 * input.Quantity))) insert.ExecuteNonQuery();
        if (failAfterOrder) throw new InvalidOperationException("injected after-order failure for isolated test");
        long id;
        using (var identity = Command(db, tx, "SELECT last_insert_rowid()")) id = (long)identity.ExecuteScalar()!;
        using (var eventInsert = Command(db, tx, "INSERT INTO outbox(event_id,order_id,request_id) VALUES($event,$order,$request)", ("$event", Guid.NewGuid().ToString()), ("$order", id), ("$request", requestId is null ? DBNull.Value : requestId))) eventInsert.ExecuteNonQuery();
        tx.Commit();
        return (201, new OrderView(id, 1, input.Quantity, 1200 * input.Quantity, "accepted"));
    }
    public OwnedOrder? Find(long id) {
        using var db = Open();
        using var query = Command(db, null, "SELECT id,product_id,quantity,total,status,owner FROM orders WHERE id=$id", ("$id", id));
        using var row = query.ExecuteReader();
        return row.Read() ? new OwnedOrder(row.GetString(5), ReadOrder(row)) : null;
    }
    public ProductView? Product(int id) {
        using var db = Open();
        using var query = Command(db, null, "SELECT id,price FROM products WHERE id=$id", ("$id", id));
        using var row = query.ExecuteReader();
        return row.Read() ? new ProductView(row.GetInt32(0), row.GetInt32(1)) : null;
    }
    public long Pending() {
        using var db = Open();
        using var query = Command(db, null, "SELECT count(*) FROM outbox WHERE processed=0");
        return (long)query.ExecuteScalar()!;
    }
    public bool ProcessOne() {
        using var db = Open();
        using var tx = db.BeginTransaction();
        string eventId;
        long orderId;
        string? requestId;
        using (var query = Command(db, tx, "SELECT event_id,order_id,request_id FROM outbox WHERE processed=0 ORDER BY rowid LIMIT 1")) {
            using var row = query.ExecuteReader();
            if (!row.Read()) { row.Close(); tx.Commit(); return false; }
            eventId = row.GetString(0); orderId = row.GetInt64(1); requestId = row.IsDBNull(2) ? null : row.GetString(2);
        }
        int inserted;
        using (var processed = Command(db, tx, "INSERT OR IGNORE INTO processed_event(event_id,processed_at) VALUES($event,datetime('now'))", ("$event", eventId))) inserted = processed.ExecuteNonQuery();
        if (inserted > 0) {
            using var fulfill = Command(db, tx, "UPDATE orders SET status='fulfilled' WHERE id=$order", ("$order", orderId));
            fulfill.ExecuteNonQuery();
        }
        using (var mark = Command(db, tx, "UPDATE outbox SET processed=1 WHERE event_id=$event", ("$event", eventId))) mark.ExecuteNonQuery();
        tx.Commit();
        Console.WriteLine(System.Text.Json.JsonSerializer.Serialize(new { @event = "local_outbox_processed", eventId, orderId, requestId }));
        return true;
    }
}
