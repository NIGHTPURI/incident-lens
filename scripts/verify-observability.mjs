import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';

// Node is only a verification client; application evidence and RCA remain Java.
const local = Object.fromEntries(readFileSync('.env', 'utf8').split(/\r?\n/)
  .filter(line => line.trim() && !line.trim().startsWith('#') && line.includes('='))
  .map(line => { const index = line.indexOf('='); return [line.slice(0, index).trim(), line.slice(index + 1).trim().replace(/^(['"])(.*)\1$/, '$2')]; }));
const setting = (name, fallback) => process.env[name] ?? local[name] ?? fallback;
const grafana = `http://127.0.0.1:${setting('GRAFANA_PORT', '3001')}`;
const headers = { Authorization: `Basic ${Buffer.from(`admin:${setting('GRAFANA_ADMIN_PASSWORD', 'incidentlens-local')}`).toString('base64')}` };
const output = process.env.TELEMETRY_PROOF_DIR ?? 'artifacts/observability';
mkdirSync(output, { recursive: true });
async function get(url, authenticated = true) {
  const response = await fetch(url, { headers: authenticated ? headers : {}, signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error(`Telemetry request failed: HTTP ${response.status}, path ${new URL(url).pathname}`);
  return response.json();
}
function save(name, data) { writeFileSync(`${output}/${name}.json`, `${JSON.stringify(data, null, 2)}\n`); }
const targets = await get('http://127.0.0.1:9090/api/v1/targets', false);
const live = targets.data.activeTargets;
if (live.length < 3 || live.some(target => target.health !== 'up')) throw new Error('All three application Prometheus targets must be healthy.');
save('prometheus-targets', targets);
const workload = await get(`http://127.0.0.1:9090/api/v1/query?${new URLSearchParams({ query: 'sum(incidentlens_workload_requests_total{service="demo-api"})' })}`, false);
const measuredRequests = Number(workload.data.result[0]?.value[1]);
if (!(measuredRequests > 0)) throw new Error('Prometheus has no positive business request counter; run an instrumented workload first.');
save('business-metric', workload);
const health = {};
for (const source of ['prometheus', 'loki']) {
  health[source] = await get(`${grafana}/api/datasources/uid/${source}/health`);
  if (health[source].status !== 'OK') throw new Error(`Grafana ${source} health is not OK.`);
}
// Grafana's bundled Tempo plugin does not implement the generic health endpoint.
// A proxied search proves Grafana can reach the actual Tempo query API instead.
const tempoSearch = await get(`${grafana}/api/datasources/proxy/uid/tempo/api/search?limit=1`);
if (!Array.isArray(tempoSearch.traces)) throw new Error('Tempo search returned an invalid response.');
health.tempo = { status: 'OK', checkedBy: 'Grafana datasource proxy -> Tempo /api/search', returnedTraces: tempoSearch.traces.length };
save('datasource-health', health);
const dashboard = await get(`${grafana}/api/dashboards/uid/incidentlens`);
if (dashboard.dashboard.panels.length < 10) throw new Error('Provisioned dashboard is missing expected panels.');
save('dashboard', { uid: dashboard.dashboard.uid, title: dashboard.dashboard.title, panelCount: dashboard.dashboard.panels.length });
const query = new URLSearchParams({ query: '{service_name="demo-worker"} |= "order_fulfilled"', since: '30m', limit: '30' });
const logs = await get(`${grafana}/api/datasources/proxy/uid/loki/loki/api/v1/query_range?${query}`);
if (!logs.data.result.length) throw new Error('No worker fulfillment logs found. Run an instrumented workload and allow OTLP export to complete.');
save('worker-logs', logs);
const faultQuery = new URLSearchParams({ query: '{service_name="control-plane"} |= "Incident fault configuration applied"', since: '30m', limit: '10' });
const faultLogs = await get(`${grafana}/api/datasources/proxy/uid/loki/loki/api/v1/query_range?${faultQuery}`);
if (!faultLogs.data.result.some(stream => stream.stream.sessionId && stream.stream.scenario)) {
  throw new Error('Structured fault timeline attributes are missing from Loki.');
}
save('fault-timeline', faultLogs);
const traceIds = new Set();
for (const stream of logs.data.result) {
  if (stream.stream.trace_id) traceIds.add(stream.stream.trace_id);
  for (const value of stream.values) if (value[2]?.trace_id) traceIds.add(value[2].trace_id);
}
let selected;
for (const id of traceIds) {
  const trace = await get(`${grafana}/api/datasources/proxy/uid/tempo/api/traces/${id}`);
  const batches = trace.batches ?? trace.resourceSpans ?? [];
  const services = [...new Set(batches.flatMap(batch => batch.resource?.attributes ?? [])
    .filter(attribute => attribute.key === 'service.name').map(attribute => attribute.value.stringValue))];
  if (services.includes('demo-api') && services.includes('demo-worker')) {
    const spanNamesByService = {};
    for (const batch of batches) {
      const name = batch.resource.attributes.find(attribute => attribute.key === 'service.name')?.value.stringValue;
      spanNamesByService[name] = [...new Set((batch.scopeSpans ?? batch.instrumentationLibrarySpans ?? [])
        .flatMap(scope => scope.spans ?? []).map(span => span.name))];
    }
    selected = { traceId: id, services, spanNamesByService };
    save('distributed-trace', trace);
    break;
  }
}
if (!selected) throw new Error('No trace links demo-api and demo-worker yet; inspect OTLP export and outbox context propagation.');
const proof = { verifiedAt: new Date().toISOString(), prometheusTargetsUp: live.length, businessRequestCount: measuredRequests,
  dashboardPanels: dashboard.dashboard.panels.length, workerLogStreams: logs.data.result.length,
  faultEventStreams: faultLogs.data.result.length, ...selected };
save('verification', proof);
console.log(JSON.stringify(proof, null, 2));
