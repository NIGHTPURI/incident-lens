import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, rmdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createStore } from './store.mjs';

test('transaction rollback, replay, owner separation and deferred fulfillment', () => {
  const dir = mkdtempSync(join(tmpdir(), 'catalog-advanced-'));
  const file = join(dir, 'isolated.db');
  const store = createStore(file);
  let reopened;
  try {
    assert.throws(() => store.create('alice', 'fail', 1, 2, true));
    assert.equal(store.find(1), null);
    assert.equal(store.pending(), 0);
    const [status, order] = store.create('alice', 'key-1', 1, 2);
    assert.equal(status, 201); assert.equal(order.status, 'accepted');
    assert.deepEqual(store.create('alice', 'key-1', 1, 2), [200, order]);
    assert.equal(store.create('alice', 'key-1', 1, 3)[0], 409);
    assert.equal(store.create('bob', 'key-1', 1, 2)[0], 201);
    assert.equal(store.pending(), 2);
    store.close();
    reopened = createStore(file);
    assert.equal(reopened.find(order.id).owner, 'alice');
    assert.equal(reopened.processOne(), true);
    assert.equal(reopened.find(order.id).order.status, 'fulfilled');
  } finally {
    reopened?.close(); store.close();
    rmSync(file, { force: true });
    rmdirSync(dir);
  }
});
