// Typed entrypoint shares the actual Express/SQLite domain implementation.
import type { Server } from 'node:http';
import { createApi } from './api.mjs';
import { createStore } from './store.mjs';
const store = createStore(process.env.PRACTICE_DB ?? 'practice.db');
const tokens: { alice: string; bob: string } = {
  alice: process.env.PRACTICE_ALICE_TOKEN ?? '', bob: process.env.PRACTICE_BOB_TOKEN ?? '',
};
const port: number = Number(process.env.PORT ?? 18183);
const server: Server = createApi(store, tokens).listen(port, '127.0.0.1');
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => server.close(() => { store.close(); }));
}
