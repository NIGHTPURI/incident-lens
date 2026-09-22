package io.incidentlens.common;

import io.micrometer.core.instrument.MeterRegistry;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.TimeUnit;

/** Bounded diagnostic evidence, not the durable metrics store. Percentiles use the latest 8192 observations. */
public class SessionTelemetry {
    private static final int MAX_SCOPES = 128;
    private final Map<String, Bucket> buckets = new LinkedHashMap<>(16, .75f, true);
    private final MeterRegistry meters;
    public SessionTelemetry(MeterRegistry meters) { this.meters = meters; }
    private synchronized Bucket bucket(String session, String phase) {
        String key = RequestContext.safe(session, "unscoped") + "/" + RequestContext.safe(phase, "NONE");
        Bucket value = buckets.computeIfAbsent(key, ignored -> new Bucket());
        while (buckets.size() > MAX_SCOPES) buckets.remove(buckets.keySet().iterator().next());
        return value;
    }
    private Bucket current() { var ctx = RequestContext.current(); return bucket(ctx.sessionId(), ctx.phase()); }
    public void request(long nanos, boolean error) {
        var b = current();
        synchronized (b) { b.requests++; if (error) b.errors++; b.latency.add(nanos / 1_000_000.0); }
        meters.timer("incidentlens.workload.duration").record(nanos, TimeUnit.NANOSECONDS);
        meters.counter("incidentlens.workload.requests", "result", error ? "error" : "success").increment();
        String traceId = TraceContext.traceId();
        if (traceId != null) synchronized (b) { if (b.traces.size() < 12) b.traces.add(traceId); }
    }
    public void database(long nanos) {
        var b = current(); synchronized (b) { b.dbQueries++; b.database.add(nanos / 1_000_000.0); }
        meters.timer("incidentlens.catalog.database").record(nanos, TimeUnit.NANOSECONDS);
    }
    public void cache(boolean hit) {
        var b = current(); synchronized (b) { if (hit) b.hits++; else b.misses++; }
        meters.counter("incidentlens.cache.requests", "result", hit ? "hit" : "miss").increment();
    }
    public void processed(boolean duplicate) {
        var b = current(); synchronized (b) { if (duplicate) b.duplicates++; else b.processed++; }
        meters.counter("incidentlens.events", "result", duplicate ? "duplicate" : "processed").increment();
    }
    public void retry() { var b = current(); synchronized (b) { b.retries++; } meters.counter("incidentlens.events.retries").increment(); }
    public void event(String type, String explanation) {
        var b = current(); var ctx = RequestContext.current();
        synchronized (b) {
            if (b.events.size() >= 32) b.events.removeFirst();
            b.events.addLast(new Event(Instant.now(), type, explanation, TraceContext.traceId(), ctx.correlationId()));
        }
    }
    public Snapshot snapshot(String service, String session, String phase, Map<String, Double> additional) {
        Bucket b = "ALL".equals(session) || "ALL".equals(phase) ? aggregate(session, phase) : bucket(session, phase);
        synchronized (b) {
            Map<String, Double> metrics = new LinkedHashMap<>();
            metrics.put("requestCount", (double) b.requests); metrics.put("errorCount", (double) b.errors);
            metrics.put("p50Ms", b.latency.percentile(.50)); metrics.put("p95Ms", b.latency.percentile(.95));
            metrics.put("p99Ms", b.latency.percentile(.99)); metrics.put("dbQueryP95Ms", b.database.percentile(.95));
            metrics.put("dbQueryCount", (double) b.dbQueries); metrics.put("latencySampleCount", (double) b.latency.size);
            metrics.put("cacheHitRate", b.hits + b.misses == 0 ? null : (double) b.hits / (b.hits + b.misses));
            metrics.put("cacheHits", (double) b.hits); metrics.put("cacheMisses", (double) b.misses);
            metrics.put("processedCount", (double) b.processed); metrics.put("duplicateCount", (double) b.duplicates);
            metrics.put("retryCount", (double) b.retries); metrics.putAll(additional);
            return new Snapshot(service, Instant.now(), metrics, new ArrayList<>(b.traces), new ArrayList<>(b.events));
        }
    }
    private synchronized Bucket aggregate(String session, String phase) {
        Bucket combined = new Bucket();
        buckets.forEach((key, value) -> {
            String[] scope = key.split("/", 2);
            if (!("ALL".equals(session) || scope[0].equals(session)) || !("ALL".equals(phase) || scope[1].equals(phase))) return;
            synchronized (value) {
                combined.requests += value.requests; combined.errors += value.errors;
                combined.hits += value.hits; combined.misses += value.misses;
                combined.processed += value.processed; combined.duplicates += value.duplicates;
                combined.dbQueries += value.dbQueries; combined.retries += value.retries;
                for (int n = 0; n < value.latency.size; n++) combined.latency.add(value.latency.values[n]);
                for (int n = 0; n < value.database.size; n++) combined.database.add(value.database.values[n]);
                for (String trace : value.traces) if (combined.traces.size() < 12) combined.traces.add(trace);
                for (Event event : value.events) { if (combined.events.size() >= 32) combined.events.removeFirst(); combined.events.addLast(event); }
            }
        });
        return combined;
    }
    public record Event(Instant timestamp, String type, String explanation, String traceId, String correlationId) { }
    public record Snapshot(String service, Instant observedAt, Map<String, Double> metrics, List<String> traceIds, List<Event> events) { }
    private static final class Bucket {
        long requests, errors, hits, misses, processed, duplicates, dbQueries, retries;
        final Samples latency = new Samples(); final Samples database = new Samples();
        final Set<String> traces = new LinkedHashSet<>(); final ArrayDeque<Event> events = new ArrayDeque<>();
    }
    static final class Samples {
        final double[] values = new double[8192]; int size, cursor;
        void add(double value) { values[cursor] = value; cursor = (cursor + 1) % values.length; size = Math.min(size + 1, values.length); }
        Double percentile(double quantile) {
            if (size == 0) return null;
            double[] sorted = Arrays.copyOf(values, size); Arrays.sort(sorted);
            return sorted[Math.max(0, (int) Math.ceil(quantile * size) - 1)];
        }
    }
}
