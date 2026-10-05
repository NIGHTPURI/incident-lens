// SQLite-backed local teaching store; node:sqlite is experimental in Node 22.
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, existsSync } from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';

const localSchema = new URL('./schema.sql', import.meta.url);
const schema = readFileSync(existsSync(localSchema) ? localSchema : new URL('../schema.sql', import.meta.url), 'utf8');
const shape = row => ({ id: row.id, productId: row.product_id, quantity: row.quantity, total: row.total, status: row.status });

export function createStore(path = 'practice.db') {
  const db = new DatabaseSync(path, { timeout: 5000 });
  db.exec(schema);
  return {
    close: () => { if (db.isOpen) db.close(); },
    create(owner, key, productId, quantity, failAfterOrder = false, requestId = null) {
      if (typeof key !== 'string' || !key || key.length > 128) return [400, { error: 'Idempotency-Key required (max 128 characters)' }];
      if (!Number.isInteger(productId) || productId !== 1) return [404, { error: 'product not found' }];
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) return [400, { error: 'quantity must be 1..100' }];
      const hash = createHash('sha256').update(JSON.stringify([productId, quantity])).digest('hex');
      db.exec('BEGIN IMMEDIATE');
      try {
        const old = db.prepare('SELECT * FROM orders WHERE owner=? AND idempotency_key=?').get(owner, key);
        if (old) {
          db.exec('COMMIT');
          return old.request_hash === hash ? [200, shape(old)] : [409, { error: 'key reused for different order' }];
        }
        const inserted = db.prepare('INSERT INTO orders(owner,idempotency_key,request_hash,product_id,quantity,total,status) VALUES(?,?,?,?,?,?,?)')
          .run(owner, key, hash, productId, quantity, 1200 * quantity, 'accepted');
        if (failAfterOrder) throw new Error('injected after-order failure for isolated test');
        const id = Number(inserted.lastInsertRowid);
        db.prepare('INSERT INTO outbox(event_id,order_id,request_id) VALUES(?,?,?)').run(randomUUID(), id, requestId);
        db.exec('COMMIT');
        return [201, { id, productId, quantity, total: 1200 * quantity, status: 'accepted' }];
      } catch (error) { db.exec('ROLLBACK'); throw error; }
    },
    find(id) {
      const row = db.prepare('SELECT * FROM orders WHERE id=?').get(id);
      return row ? { owner: row.owner, order: shape(row) } : null;
    },
    product(id) { return db.prepare('SELECT id,price FROM products WHERE id=?').get(id) ?? null; },
    pending() { return db.prepare('SELECT count(*) AS count FROM outbox WHERE processed=0').get().count; },
    processOne() {
      db.exec('BEGIN IMMEDIATE');
      try {
        const event = db.prepare('SELECT event_id,order_id,request_id FROM outbox WHERE processed=0 ORDER BY rowid LIMIT 1').get();
        if (!event) { db.exec('COMMIT'); return false; }
        const inserted = db.prepare("INSERT OR IGNORE INTO processed_event(event_id,processed_at) VALUES(?,datetime('now'))").run(event.event_id);
        if (inserted.changes) db.prepare("UPDATE orders SET status='fulfilled' WHERE id=?").run(event.order_id);
        db.prepare('UPDATE outbox SET processed=1 WHERE event_id=?').run(event.event_id);
        db.exec('COMMIT');
        console.log(JSON.stringify({ event: 'local_outbox_processed', eventId: event.event_id, orderId: event.order_id, requestId: event.request_id }));
        return true;
      } catch (error) { db.exec('ROLLBACK'); throw error; }
    },
  };
}
