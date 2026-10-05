PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY,
  price INTEGER NOT NULL CHECK (price > 0)
);
INSERT OR IGNORE INTO products(id,price) VALUES(1,1200);
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY,
  owner TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  product_id INTEGER NOT NULL CHECK (product_id = 1),
  quantity INTEGER NOT NULL CHECK (quantity BETWEEN 1 AND 100),
  total INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('accepted', 'fulfilled')),
  UNIQUE (owner, idempotency_key)
);
CREATE TABLE IF NOT EXISTS outbox (
  event_id TEXT PRIMARY KEY,
  order_id INTEGER NOT NULL UNIQUE REFERENCES orders(id),
  request_id TEXT,
  processed INTEGER NOT NULL DEFAULT 0 CHECK (processed IN (0, 1))
);
CREATE TABLE IF NOT EXISTS processed_event (
  event_id TEXT PRIMARY KEY,
  processed_at TEXT NOT NULL
);
