package io.incidentlens.control;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.*;

@Service
class EvidenceCollector {
    private record Metric(String type, String unit, String description) {}
    private static final Map<String, Metric> METRICS = Map.ofEntries(
        Map.entry("requestCount", new Metric("REQUEST_COUNT", "requests", "Requests recorded in the selected session and phase")),
        Map.entry("errorCount", new Metric("ERROR_COUNT", "errors", "Failed requests recorded in the selected session and phase")),
        Map.entry("p95Ms", new Metric("LATENCY_P95", "ms", "95th percentile observed request latency")),
        Map.entry("p99Ms", new Metric("LATENCY_P99", "ms", "99th percentile observed request latency")),
        Map.entry("dbQueryP95Ms", new Metric("DB_QUERY_P95", "ms", "95th percentile measured catalog database lookup duration")),
        Map.entry("dbQueryCount", new Metric("DB_LOOKUP_COUNT", "lookups", "Logical catalog database loads; degraded loads execute multiple SQL statements")),
        Map.entry("kafkaLag", new Metric("KAFKA_LAG", "events", "Latest sampled consumer group backlog (normally refreshed every 2 seconds); shared across sessions")),
        Map.entry("cacheHitRate", new Metric("CACHE_HIT_RATE", "ratio", "Observed cache hits divided by cache lookups")),
        Map.entry("outboxPending", new Metric("OUTBOX_PENDING", "events", "Unpublished durable outbox rows at collection time; shared across sessions")),
        Map.entry("processedCount", new Metric("PROCESSED_COUNT", "events", "Events processed by worker in the selected scope")),
        Map.entry("retryCount", new Metric("RETRY_COUNT", "attempts", "Bounded consumer processing retries")),
        Map.entry("timeoutCount", new Metric("TIMEOUT_COUNT", "events", "Downstream calls exceeding the configured timeout"))
    );
    private final JdbcTemplate jdbc;
    private final TelemetryClient telemetry;
    EvidenceCollector(JdbcTemplate jdbc, TelemetryClient telemetry) { this.jdbc = jdbc; this.telemetry = telemetry; }
    @Transactional
    public List<Models.Evidence> collect(String sessionId, Instant start, String phase) {
        List<Models.Evidence> evidence = build(sessionId, start, phase, telemetry.snapshots(sessionId, phase));
        for (Models.Evidence e : evidence) {
            jdbc.update("INSERT INTO evidence(id,session_id,window_start,window_end,source,service,evidence_type,metric_value,unit,trace_id,explanation,phase) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)",
                e.id(), e.sessionId(), Timestamp.from(e.windowStart()), Timestamp.from(e.windowEnd()), e.source(), e.service(), e.type(), e.value(), e.unit(), e.traceId(), e.explanation(), e.phase());
        }
        return evidence;
    }
    static List<Models.Evidence> build(String sessionId, Instant start, String phase, List<TelemetryClient.Snapshot> snapshots) {
        List<Models.Evidence> result = new ArrayList<>();
        for (var snapshot : snapshots) {
            String source = snapshot.service() + ":/internal/telemetry?sessionId=" + sessionId + "&phase=" + phase;
            if (!snapshot.available()) {
                result.add(item(sessionId, start, snapshot.observedAt(), source, snapshot.service(), "TELEMETRY_UNAVAILABLE", null, "status", null,
                    "Telemetry endpoint unavailable. Missing values must not be interpreted as zero.", phase));
                continue;
            }
            snapshot.metrics().entrySet().stream().sorted(Map.Entry.comparingByKey()).forEach(entry -> {
                Metric metric = METRICS.get(entry.getKey());
                if (metric != null) result.add(item(sessionId, start, snapshot.observedAt(), source, snapshot.service(), metric.type(), entry.getValue(), metric.unit(), null,
                    metric.description() + ". Value=" + entry.getValue() + " " + metric.unit() + ". Phase=" + phase + ".", phase));
            });
            for (String trace : snapshot.traceIds()) result.add(item(sessionId, start, snapshot.observedAt(), source, snapshot.service(), "TRACE_REFERENCE", null, "trace", trace,
                "Selected observed trace ID; open in Tempo to inspect causal spans. Trace storage requires the observability profile.", phase));
            for (var event : snapshot.events()) result.add(item(sessionId, event.timestamp(), event.timestamp(), source,
                snapshot.service(), event.type(), null, "event", event.traceId(), event.explanation()
                    + (event.correlationId() == null ? "" : " Correlation=" + event.correlationId()), phase));
        }
        return result;
    }
    private static Models.Evidence item(String session, Instant start, Instant end, String source, String service,
                                        String type, Double value, String unit, String trace, String explanation, String phase) {
        return new Models.Evidence(UUID.randomUUID().toString(), session, start, end, source, service, type, value, unit, trace, explanation, phase);
    }
    List<Models.Evidence> list(String sessionId) {
        return jdbc.query("SELECT * FROM evidence WHERE session_id=? ORDER BY window_end DESC,id LIMIT 500", this::map, sessionId);
    }
    List<Models.Evidence> includeCitations(String sessionId, List<Models.Evidence> visible, List<String> citations) {
        Map<String, Models.Evidence> combined = new LinkedHashMap<>();
        visible.forEach(e -> combined.put(e.id(), e));
        for (String id : citations) {
            if (!combined.containsKey(id)) jdbc.query("SELECT * FROM evidence WHERE session_id=? AND id=?", this::map, sessionId, id)
                .forEach(e -> combined.put(e.id(), e));
        }
        return List.copyOf(combined.values());
    }
    private Models.Evidence map(java.sql.ResultSet rs, int row) throws java.sql.SQLException {
        return new Models.Evidence(rs.getString("id"), rs.getString("session_id"), rs.getTimestamp("window_start").toInstant(), rs.getTimestamp("window_end").toInstant(),
            rs.getString("source"), rs.getString("service"), rs.getString("evidence_type"), rs.getObject("metric_value", Double.class), rs.getString("unit"), rs.getString("trace_id"), rs.getString("explanation"), rs.getString("phase"));
    }
}
