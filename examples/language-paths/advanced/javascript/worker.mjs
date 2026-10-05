// Separate local outbox poller; never a Kafka consumer.
import { createStore } from './store.mjs';
const store = createStore(process.env.PRACTICE_DB ?? 'practice.db');
const timer = setInterval(() => {
  try { store.processOne(); }
  catch (error) { console.error(JSON.stringify({ event: 'worker_error', type: error.name })); }
}, 1000);
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => { clearInterval(timer); store.close(); });
console.log(JSON.stringify({ event: 'worker_ready' }));
