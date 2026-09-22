package io.incidentlens.control;

import org.springframework.stereotype.Component;
import java.time.Instant;
import java.util.*;

@Component
public class RuleBasedRcaProvider implements RcaProvider {
    private record Rule(String type, java.util.function.DoublePredicate matches, String cause, String action) {}
    private static final List<Rule> RULES = List.of(
        new Rule("KAFKA_LAG", v -> v > 10, "Consumer throughput is below event production; slow processing or a stalled consumer is plausible.", "Restore consumer speed; watch lag drain and check retry/DLQ counters before increasing concurrency."),
        new Rule("CACHE_HIT_RATE", v -> v < 0.5, "Low cache reuse may be increasing database work; cold start and disabled cache are competing explanations.", "Inspect cache misses and database query counts; restore caching and compare an identical workload after warm-up."),
        new Rule("DB_QUERY_P95", v -> v > 20, "Database lookup work is slow; repeated lookups or an inefficient query plan are plausible.", "Compare indexed/batched queries with the degraded query path; inspect EXPLAIN and pool saturation."),
        new Rule("LATENCY_P95", v -> v > 200, "A slow synchronous dependency or injected downstream delay is consistent with the request latency.", "Inspect the cited trace spans, restore the downstream path, and repeat the same workload.")
    );
    @Override
    public Models.Report analyze(List<Models.Evidence> evidence) {
        List<Models.Evidence> observed = evidence.stream().filter(e -> e.value() != null && Double.isFinite(e.value())).toList();
        List<String> causes = new ArrayList<>();
        List<String> actions = new ArrayList<>();
        Set<String> citations = new LinkedHashSet<>();
        for (Rule rule : RULES) {
            observed.stream().filter(e -> rule.type().equals(e.type()) && rule.matches().test(e.value())).findFirst().ifPresent(e -> {
                causes.add(rule.cause()); actions.add(rule.action()); citations.add(e.id());
            });
        }
        Map<String, String> interventions = Map.of(
            "INEFFICIENT_QUERY", "The catalog recorded execution of the intentionally inefficient query path; repeated SQL work is a supported candidate cause.",
            "CACHE_BYPASS", "The catalog recorded a cache bypass; increased database load is consistent with disabled caching.",
            "DOWNSTREAM_DELAY", "The request path recorded an injected downstream delay.",
            "DOWNSTREAM_TIMEOUT", "The request path recorded exhaustion of the downstream timeout budget.",
            "CONSUMER_DELAY", "The worker recorded an injected processing delay; this can reduce consumption throughput.");
        evidence.stream().filter(e -> interventions.containsKey(e.type())).forEach(e -> {
            causes.add(interventions.get(e.type())); citations.add(e.id());
            if (actions.isEmpty()) actions.add("Disable the recorded fault, repeat the identical workload, and compare measured evidence before concluding causality.");
        });
        boolean hasTraffic = observed.stream().anyMatch(e -> (e.type().equals("REQUEST_COUNT") || e.type().equals("PROCESSED_COUNT")) && e.value() > 0);
        if (!hasTraffic) { causes.clear(); actions.clear(); citations.clear(); }
        observed.stream().filter(e -> e.type().equals("REQUEST_COUNT") || e.type().equals("ERROR_COUNT")).limit(4).forEach(e -> citations.add(e.id()));
        List<String> uncertainties = new ArrayList<>(List.of(
            "Rules identify correlated symptoms, not proven causation; confidence is a heuristic, not a calibrated probability.",
            "Kafka lag and outbox backlog are shared gauges; unrelated traffic can affect them.",
            "Compare BEFORE and AFTER under the same load; a single sample cannot establish a performance improvement."));
        if (evidence.stream().anyMatch(e -> e.type().equals("TELEMETRY_UNAVAILABLE"))) uncertainties.add("At least one service has unavailable telemetry.");
        if (!hasTraffic) uncertainties.add("No workload was observed in this evidence window.");
        return new Models.Report(causes.isEmpty() ? "Insufficient evidence to identify an incident cause." : "Observed symptoms support " + causes.size() + " candidate explanation(s).",
            causes.isEmpty() ? "Insufficient evidence; no supported root-cause hypothesis." : String.join(" ", causes),
            causes.isEmpty() ? 0.0 : 0.65, List.copyOf(citations),
            "Observed counts and latency are listed in the cited evidence; user impact beyond this local workload is unknown.",
            actions.isEmpty() ? List.of("Run the scoped workload and collect telemetry before drawing a conclusion.") : List.copyOf(actions),
            uncertainties, "rule-based", Instant.now());
    }
}
