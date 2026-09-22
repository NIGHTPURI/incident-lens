package io.incidentlens.control;

import org.junit.jupiter.api.Test;
import java.time.Instant;
import java.util.*;
import static org.assertj.core.api.Assertions.*;

class EvidenceAndRcaTest {
    static Models.Evidence metric(String id, String type, Double value) {
        return new Models.Evidence(id, "session", Instant.EPOCH, Instant.now(), "test-source", "demo-api", type,
                value, "unit", null, "Observed test measurement", "BEFORE");
    }
    @Test void noTrafficMustNotProduceConfidentDiagnosis() {
        var report = new RuleBasedRcaProvider().analyze(List.of(metric("e1", "CACHE_HIT_RATE", 0.0)));
        assertThat(report.confidence()).isZero();
        assertThat(report.suspectedRootCause()).contains("Insufficient evidence");
    }
    @Test void rulesCiteObservedEvidenceAndStateUncertainty() {
        var evidence = List.of(metric("requests", "REQUEST_COUNT", 100.0), metric("latency", "LATENCY_P95", 600.0));
        var report = new RuleBasedRcaProvider().analyze(evidence);
        assertThat(report.evidenceIds()).contains("latency", "requests");
        assertThat(report.suspectedRootCause()).contains("downstream");
        assertThat(report.uncertainties()).isNotEmpty();
        assertThatCode(() -> RcaValidator.validate(report, evidence)).doesNotThrowAnyException();
    }
    @Test void absentServiceDoesNotBecomeZeroMeasurements() {
        var snapshot = new TelemetryClient.Snapshot("demo-worker", Instant.now(), Map.of(), List.of(), false);
        var evidence = EvidenceCollector.build("session", Instant.EPOCH, "BEFORE", List.of(snapshot));
        assertThat(evidence).hasSize(1);
        assertThat(evidence.getFirst().type()).isEqualTo("TELEMETRY_UNAVAILABLE");
        assertThat(evidence.getFirst().value()).isNull();
        assertThat(evidence.getFirst().source()).contains("phase=BEFORE");
    }
    @Test void unpublishedOutboxBacklogRemainsEvidenceWhenKafkaLagIsZero() {
        var evidence = List.of(metric("requests", "REQUEST_COUNT", 300.0),
                metric("outbox", "OUTBOX_PENDING", 200.0), metric("lag", "KAFKA_LAG", 0.0));
        var report = new RuleBasedRcaProvider().analyze(evidence);
        assertThat(report.evidenceIds()).contains("outbox", "requests").doesNotContain("lag");
        assertThat(report.suspectedRootCause()).contains("before Kafka publication", "competing explanations");
        assertThat(report.recommendedActions()).anySatisfy(action -> assertThat(action).contains("both outbox backlog and consumer lag"));
        assertThatCode(() -> RcaValidator.validate(report, evidence)).doesNotThrowAnyException();
    }
    @Test void collectorRetainsProvenanceAndTraceLinks() {
        var snapshot = new TelemetryClient.Snapshot("demo-api", Instant.now(), Map.of("p95Ms", 410.0), List.of("1234567890abcdef1234567890abcdef"), true);
        var evidence = EvidenceCollector.build("session", Instant.EPOCH, "BEFORE", List.of(snapshot));
        assertThat(evidence).hasSize(2);
        assertThat(evidence).allSatisfy(e -> { assertThat(e.id()).isNotBlank(); assertThat(e.windowStart()).isEqualTo(Instant.EPOCH); });
        assertThat(evidence).anySatisfy(e -> assertThat(e.traceId()).isEqualTo("1234567890abcdef1234567890abcdef"));
    }
    @Test void inventedEvidenceAndInvalidConfidenceAreRejected() {
        var evidence = List.of(metric("real", "REQUEST_COUNT", 10.0));
        for (double confidence : new double[]{-0.1, 1.1, Double.NaN, Double.POSITIVE_INFINITY}) {
            assertThatThrownBy(() -> RcaValidator.validate(report(confidence, List.of("real")), evidence)).isInstanceOf(IllegalArgumentException.class);
        }
        assertThatThrownBy(() -> RcaValidator.validate(report(.5, List.of("invented")), evidence)).hasMessageContaining("unsupported");
        assertThatThrownBy(() -> RcaValidator.validate(report(.5, List.of()), evidence)).hasMessageContaining("unsupported");
    }
    static Models.Report report(double confidence, List<String> ids) {
        return new Models.Report("Summary", "Hypothesis", confidence, ids, "Observed impact", List.of("Check traces"), List.of("Limited sample"), "test", Instant.now());
    }
}
