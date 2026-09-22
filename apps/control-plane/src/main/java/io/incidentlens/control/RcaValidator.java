package io.incidentlens.control;

import java.util.*;
import java.util.stream.Collectors;

final class RcaValidator {
    private RcaValidator() {}
    static Models.Report validate(Models.Report report, List<Models.Evidence> evidence) {
        if (report == null || !text(report.summary()) || !text(report.suspectedRootCause()) || !text(report.impact())
            || !Double.isFinite(report.confidence()) || report.confidence() < 0 || report.confidence() > 1
            || !strings(report.recommendedActions()) || !strings(report.uncertainties())
            || report.uncertainties().isEmpty() || report.evidenceIds() == null || report.evidenceIds().size() > 100) {
            throw new IllegalArgumentException("Invalid RCA schema");
        }
        Set<String> known = evidence.stream().map(Models.Evidence::id).collect(Collectors.toSet());
        if (!known.containsAll(report.evidenceIds()) || (report.confidence() > 0 && report.evidenceIds().isEmpty())) {
            throw new IllegalArgumentException("RCA contains unsupported evidence references");
        }
        boolean traffic = evidence.stream().anyMatch(e -> e.value() != null && e.value() > 0
            && ("REQUEST_COUNT".equals(e.type()) || "PROCESSED_COUNT".equals(e.type())));
        Set<String> events = Set.of("INEFFICIENT_QUERY", "CACHE_BYPASS", "DOWNSTREAM_DELAY", "DOWNSTREAM_TIMEOUT", "CONSUMER_DELAY", "CONSUMER_RETRY");
        Set<String> measurements = Set.of("LATENCY_P95", "LATENCY_P99", "DB_QUERY_P95", "KAFKA_LAG", "ERROR_COUNT", "RETRY_COUNT", "TIMEOUT_COUNT");
        boolean citedSymptom = evidence.stream().anyMatch(e -> report.evidenceIds().contains(e.id())
            && (events.contains(e.type()) || (e.value() != null && Double.isFinite(e.value())
                && ((measurements.contains(e.type()) && e.value() > 0) || ("CACHE_HIT_RATE".equals(e.type()) && e.value() < 1)))));
        if (report.confidence() > 0 && (!traffic || !citedSymptom)) {
            throw new IllegalArgumentException("Positive confidence requires observed traffic and a cited symptom");
        }
        return report;
    }
    private static boolean text(String s) { return s != null && !s.isBlank() && s.length() <= 4000; }
    private static boolean strings(List<String> values) { return values != null && values.size() <= 20 && values.stream().allMatch(RcaValidator::text); }
}
