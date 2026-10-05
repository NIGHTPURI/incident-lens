import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer, makeStore } from './app.mjs';

test('order contract and same-process idempotency', async () => {
  const server = createServer(makeStore());
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const product = await fetch(`${base}/products/1`);
    assert.equal(product.status, 200);
    assert.equal((await product.json()).price, 1200);
    const options = body => ({ method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': 'a' }, body: JSON.stringify(body) });
    const first = await fetch(`${base}/orders`, options({ productId: 1, quantity: 2 }));
    assert.equal(first.status, 201);
    assert.deepEqual(await first.json(), { id: 1, productId: 1, quantity: 2, total: 2400, status: 'accepted' });
    assert.equal((await fetch(`${base}/orders`, options({ productId: 1, quantity: 2 }))).status, 200);
    assert.equal((await fetch(`${base}/orders`, options({ productId: 1, quantity: 3 }))).status, 409);
    assert.equal((await fetch(`${base}/orders/1`)).status, 200);
    assert.equal((await fetch(`${base}/products/9`)).status, 404);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
