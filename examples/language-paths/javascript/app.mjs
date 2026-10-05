// Loopback-only, in-memory catalog/order learning API; not production security.
import http from 'node:http';
import { pathToFileURL } from 'node:url';

export function makeStore() {
  const orders = new Map();
  const keys = new Map();
  return {
    orders,
    create(key, productId, quantity) {
      if (!key) return [400, { error: 'Idempotency-Key required' }];
      if (!Number.isInteger(productId) || productId !== 1) return [404, { error: 'product not found' }];
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) return [400, { error: 'quantity must be 1..100' }];
      const fingerprint = JSON.stringify([productId, quantity]);
      const previous = keys.get(key);
      if (previous) return previous.fingerprint === fingerprint
        ? [200, orders.get(previous.id)]
        : [409, { error: 'key reused for different order' }];
      const id = orders.size + 1;
      const order = { id, productId, quantity, total: 1200 * quantity, status: 'accepted' };
      orders.set(id, order);
      keys.set(key, { fingerprint, id });
      return [201, order];
    },
  };
}

function send(res, status, body) {
  const data = JSON.stringify(body);
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(data);
}

export function createServer(store = makeStore()) {
  return http.createServer(async (req, res) => {
    const path = new URL(req.url, 'http://127.0.0.1').pathname;
    if (req.method === 'GET') {
      if (path === '/health') return send(res, 200, { status: 'up' });
      if (path === '/products/1') return send(res, 200, { id: 1, price: 1200 });
      if (path.startsWith('/products/')) return send(res, 404, { error: 'product not found' });
      if (path.startsWith('/orders/')) {
        const id = Number(path.slice('/orders/'.length));
        if (!Number.isInteger(id)) return send(res, 400, { error: 'order ID must be an integer' });
        const order = store.orders.get(id);
        return send(res, order ? 200 : 404, order ?? { error: 'order not found' });
      }
    }
    if (req.method === 'POST' && path === '/orders') {
      let text = '';
      for await (const chunk of req) {
        text += chunk;
        if (Buffer.byteLength(text) > 4096) return send(res, 400, { error: 'body too large' });
      }
      let body;
      try { body = JSON.parse(text); }
      catch { return send(res, 400, { error: 'valid JSON object required' }); }
      if (body === null || Array.isArray(body) || typeof body !== 'object') return send(res, 400, { error: 'valid JSON object required' });
      const [status, result] = store.create(req.headers['idempotency-key'], body.productId, body.quantity);
      return send(res, status, result);
    }
    return send(res, 404, { error: 'route not found' });
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT ?? 18182);
  createServer().listen(port, '127.0.0.1', () => console.log(`practice API: http://127.0.0.1:${port}`));
}
