"""SQLite-backed teaching store. No connection to IncidentLens services."""
import hashlib
import json
import sqlite3
from contextlib import closing
from pathlib import Path
from uuid import uuid4

SCHEMA = Path(__file__).resolve().parents[1] / "schema.sql"


class Store:
    def __init__(self, path: str):
        self.path = path
        with closing(self._connect()) as db:
            db.executescript(SCHEMA.read_text(encoding="utf-8"))

    def _connect(self):
        db = sqlite3.connect(self.path, timeout=5, isolation_level=None)
        db.row_factory = sqlite3.Row
        db.execute("PRAGMA foreign_keys = ON")
        return db

    @staticmethod
    def _order(row):
        return {"id": row["id"], "productId": row["product_id"], "quantity": row["quantity"], "total": row["total"], "status": row["status"]}

    def product(self, product_id: int):
        with closing(self._connect()) as db:
            row = db.execute("SELECT id,price FROM products WHERE id=?", (product_id,)).fetchone()
            return None if row is None else {"id": row["id"], "price": row["price"]}

    def create(self, owner: str, key: str, product_id: int, quantity: int, *, fail_after_order=False, request_id=None):
        if not key or len(key) > 128:
            return 400, {"error": "Idempotency-Key required (max 128 characters)"}
        if type(product_id) is not int or product_id != 1:
            return 404, {"error": "product not found"}
        if type(quantity) is not int or not 1 <= quantity <= 100:
            return 400, {"error": "quantity must be 1..100"}
        fingerprint = hashlib.sha256(json.dumps([product_id, quantity]).encode()).hexdigest()
        with closing(self._connect()) as db:
            db.execute("BEGIN IMMEDIATE")
            try:
                old = db.execute("SELECT * FROM orders WHERE owner=? AND idempotency_key=?", (owner, key)).fetchone()
                if old:
                    db.execute("COMMIT")
                    return (200, self._order(old)) if old["request_hash"] == fingerprint else (409, {"error": "key reused for different order"})
                cursor = db.execute("INSERT INTO orders(owner,idempotency_key,request_hash,product_id,quantity,total,status) VALUES(?,?,?,?,?,?,?)", (owner, key, fingerprint, product_id, quantity, 1200 * quantity, "accepted"))
                if fail_after_order:
                    raise RuntimeError("injected after-order failure for isolated test")
                db.execute("INSERT INTO outbox(event_id,order_id,request_id) VALUES(?,?,?)", (str(uuid4()), cursor.lastrowid, request_id))
                db.execute("COMMIT")
                return 201, {"id": cursor.lastrowid, "productId": product_id, "quantity": quantity, "total": 1200 * quantity, "status": "accepted"}
            except BaseException:
                db.execute("ROLLBACK")
                raise

    def find(self, order_id: int):
        with closing(self._connect()) as db:
            row = db.execute("SELECT * FROM orders WHERE id=?", (order_id,)).fetchone()
            return None if row is None else (row["owner"], self._order(row))

    def pending(self):
        with closing(self._connect()) as db:
            return db.execute("SELECT count(*) FROM outbox WHERE processed=0").fetchone()[0]

    def process_one(self):
        with closing(self._connect()) as db:
            db.execute("BEGIN IMMEDIATE")
            try:
                event = db.execute("SELECT event_id, order_id, request_id FROM outbox WHERE processed=0 ORDER BY rowid LIMIT 1").fetchone()
                if event is None:
                    db.execute("COMMIT")
                    return False
                inserted = db.execute("INSERT OR IGNORE INTO processed_event(event_id,processed_at) VALUES(?,datetime('now'))", (event["event_id"],)).rowcount
                if inserted:
                    db.execute("UPDATE orders SET status='fulfilled' WHERE id=?", (event["order_id"],))
                db.execute("UPDATE outbox SET processed=1 WHERE event_id=?", (event["event_id"],))
                db.execute("COMMIT")
                print(json.dumps({"event": "local_outbox_processed", "requestId": event["request_id"], "orderId": event["order_id"], "eventId": event["event_id"]}), flush=True)
                return True
            except BaseException:
                db.execute("ROLLBACK")
                raise
