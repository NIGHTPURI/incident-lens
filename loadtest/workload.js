import http from 'k6/http';
import { sleep } from 'k6';
import { Counter, Trend } from 'k6/metrics';
import execution from 'k6/execution';

// Only business requests contribute to these metrics, never control-plane calls.
const requests = new Counter('workload_requests');
const errors = new Counter('workload_errors');
const latency = new Trend('workload_latency', true);
const catalogRequests = new Counter('catalog_requests');
const catalogErrors = new Counter('catalog_errors');
const catalogLatency = new Trend('catalog_latency', true);
const orderRequests = new Counter('order_requests');
const orderErrors = new Counter('order_errors');
const orderLatency = new Trend('order_latency', true);
const vus = Number(__ENV.VUS || 5);
const durationSeconds = Number(__ENV.DURATION_SECONDS || 20);
const baseUrl = __ENV.BASE_URL || 'http://localhost:8081';
const sessionId = __ENV.SESSION_ID || '';
const phase = __ENV.PHASE || 'BASELINE';
const runId = __ENV.RUN_ID || String(Date.now());

export const options = {
  scenarios: {
    workload: { executor: 'constant-vus', vus, duration: `${durationSeconds}s`, gracefulStop: '10s' },
  },
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(50)', 'p(95)', 'p(99)'],
  // Latency incidents are expected to be slow. Do not impose invented SLO thresholds.
  thresholds: { workload_requests: ['count>0'] },
};

function record(response, route) {
  const error = response.status >= 200 && response.status < 300 ? 0 : 1;
  requests.add(1);
  errors.add(error);
  latency.add(response.timings.duration);
  (route === 'catalog' ? catalogRequests : orderRequests).add(1);
  (route === 'catalog' ? catalogErrors : orderErrors).add(error);
  (route === 'catalog' ? catalogLatency : orderLatency).add(response.timings.duration);
}

export default function () {
  const headers = {
    'Content-Type': 'application/json',
    'X-Incident-Id': sessionId,
    'X-Experiment-Phase': phase,
  };
  record(http.get(`${baseUrl}/api/catalog?category=books`, { headers, timeout: '8s', tags: { name: 'GET /api/catalog' } }), 'catalog');
  const idempotencyKey = `${runId}-${phase}-${execution.vu.idInTest}-${execution.scenario.iterationInTest}`;
  record(http.post(`${baseUrl}/api/orders`, JSON.stringify({ productId: 1, quantity: 1 }), {
    headers: { ...headers, 'Idempotency-Key': idempotencyKey },
    timeout: '8s',
    tags: { name: 'POST /api/orders' },
  }), 'order');
  sleep(0.05);
}

export function handleSummary(data) {
  const metric = data.metrics.workload_latency?.values || {};
  const summary = {
    requestCount: data.metrics.workload_requests?.values.count || 0,
    errorCount: data.metrics.workload_errors?.values.count || 0,
    // Include graceful completion in elapsed time rather than inflating throughput.
    durationSeconds: data.state.testRunDurationMs / 1000,
    p50Ms: metric['p(50)'] || 0,
    p95Ms: metric['p(95)'] || 0,
    p99Ms: metric['p(99)'] || 0,
    workload: { vus, durationSeconds },
  };
  const output = JSON.stringify(summary, null, 2);
  const summaryPath = __ENV.SUMMARY_PATH || '/results/baseline.json';
  // Keep route diagnostics out of the strictly validated completion API payload.
  const diagnostics = Object.fromEntries(['catalog', 'order'].map(route => [route, {
    requestCount: data.metrics[`${route}_requests`]?.values.count || 0,
    errorCount: data.metrics[`${route}_errors`]?.values.count || 0,
    latencyMs: data.metrics[`${route}_latency`]?.values || {},
  }]));
  return {
    stdout: `${output}\n`,
    [summaryPath]: output,
    [summaryPath.replace(/\.json$/, '') + '.diagnostics.json']: JSON.stringify(diagnostics, null, 2),
  };
}
