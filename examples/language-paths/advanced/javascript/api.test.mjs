import test from 'node:test';
import assert from 'node:assert/strict';
import { createApi } from './api.mjs';
import { createStore } from './store.mjs';

test('HTTP identity and owner boundary with an isolated SQLite database', async () => {
  const store = createStore(':memory:');
  const tokens = { alice: 'local-alice-token-very-long-only-for-tests', bob: 'local-bob-token-very-long-only-for-tests' };
  const server = createApi(store, tokens).listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const unauth = await fetch(`${base}/orders/1`);
    assert.equal(unauth.status, 401);
    const created = await fetch(`${base}/orders`, { method: 'POST', headers: { Authorization: `Bearer ${tokens.alice}`, 'Content-Type': 'application/json', 'Idempotency-Key': 'order-1' }, body: JSON.stringify({ productId: 1, quantity: 2 }) });
    assert.equal(created.status, 201);
    const order = await created.json();
    assert.equal((await fetch(`${base}/orders/${order.id}`, { headers: { Authorization: `Bearer ${tokens.bob}` } })).status, 403);
    assert.equal((await fetch(`${base}/metrics`, { headers: { Authorization: `Bearer ${tokens.alice}` } })).status, 200);
  } finally { await new Promise(resolve => server.close(resolve)); store.close(); }
});
