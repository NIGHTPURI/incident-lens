// Express API with local exercise tokens. No issuer/signature validation or production auth.
import express from 'express';
import { randomUUID, timingSafeEqual } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { createStore } from './store.mjs';
import { createCache } from './cache.mjs';

const equal = (a, b) => {
  const left = Buffer.from(a ?? '');
  const right = Buffer.from(b ?? '');
  return left.length === right.length && timingSafeEqual(left, right);
};

export function createApi(store, tokens) {
  if (!tokens?.alice || !tokens?.bob || tokens.alice.length < 24 || tokens.bob.length < 24 || tokens.alice === tokens.bob) throw new Error('two distinct exercise tokens of at least 24 characters required');
  const app = express();
  const metrics = { requests: 0, errors: 0, durationMsSum: 0 };
  const cache = createCache();
  app.use(express.json({ limit: '4kb' }));
  app.use((req, res, next) => {
    const started = performance.now();
    const requestId = randomUUID();
    req.requestId = requestId;
    res.setHeader('X-Request-Id', requestId);
    res.on('finish', () => {
      const elapsedMs = performance.now() - started;
      metrics.requests++;
      metrics.errors += Number(res.statusCode >= 400);
      metrics.durationMsSum += elapsedMs;
      console.log(JSON.stringify({ requestId, path: req.path, status: res.statusCode, elapsedMs: Number(elapsedMs.toFixed(2)) }));
    });
    next();
  });
  function actor(req, res, next) {
    const match = /^Bearer (.+)$/i.exec(req.get('authorization') ?? '');
    if (!match) return res.status(401).json({ error: 'bearer token required' });
    if (equal(match[1], tokens.alice)) req.owner = 'alice';
    else if (equal(match[1], tokens.bob)) req.owner = 'bob';
    else return res.status(401).json({ error: 'invalid bearer token' });
    next();
  }
  app.get('/health', (_req, res) => res.json({ status: 'up' }));
  app.get('/products/:id', (req, res) => {
    if (!/^\d+$/.test(req.params.id)) return res.status(400).json({ error: 'product ID must be an integer' });
    const product = cache.getOrLoad(Number(req.params.id), () => store.product(Number(req.params.id)));
    return product ? res.json(product) : res.status(404).json({ error: 'product not found' });
  });
  app.post('/orders', actor, (req, res) => {
    const { productId, quantity } = req.body ?? {};
    const [status, body] = store.create(req.owner, req.get('Idempotency-Key'), productId, quantity, false, req.requestId);
    res.status(status).json(body);
  });
  app.get('/orders/:id', actor, (req, res) => {
    if (!/^\d+$/.test(req.params.id)) return res.status(400).json({ error: 'order ID must be an integer' });
    const found = store.find(Number(req.params.id));
    if (!found) return res.status(404).json({ error: 'order not found' });
    if (found.owner !== req.owner) return res.status(403).json({ error: 'order access denied' });
    res.json(found.order);
  });
  app.get('/metrics', actor, (_req, res) => res.json({ ...metrics, cache: cache.snapshot(), outboxPending: store.pending(), scope: 'one API process; not Prometheus' }));
  app.use((error, _req, res, _next) => {
    const inputError = ['entity.too.large', 'entity.parse.failed'].includes(error.type);
    res.status(inputError ? (error.type === 'entity.too.large' ? 413 : 400) : 503).json({ error: inputError ? 'invalid JSON body' : 'store temporarily unavailable' });
  });
  return app;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const store = createStore(process.env.PRACTICE_DB ?? 'practice.db');
  const app = createApi(store, { alice: process.env.PRACTICE_ALICE_TOKEN, bob: process.env.PRACTICE_BOB_TOKEN });
  const port = Number(process.env.PORT ?? 18183);
  const server = app.listen(port, '127.0.0.1', () => console.log(`advanced practice: http://127.0.0.1:${port}`));
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => server.close(() => store.close()));
}
