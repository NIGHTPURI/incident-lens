package io.incidentlens.control;

import com.fasterxml.jackson.databind.json.JsonMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.embedded.EmbeddedDatabaseBuilder;
import org.springframework.jdbc.datasource.embedded.EmbeddedDatabaseType;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.Mockito.mock;

class RcaPhaseLimitTest {
    private org.springframework.jdbc.datasource.embedded.EmbeddedDatabase embedded;
    protected JdbcTemplate database() {
        embedded = new EmbeddedDatabaseBuilder().setType(EmbeddedDatabaseType.H2).generateUniqueName(true)
            .addScript("db/migration/V1__control_plane.sql").build();
        var jdbc = new JdbcTemplate(embedded);
        jdbc.execute("SET MODE MySQL");
        return jdbc;
    }
    protected void closeDatabase() { if (embedded != null) embedded.shutdown(); }
    @Test
    void laterAfterRowsDoNotDisplaceBeforeEvidenceFromGeneratedAndReloadedReport() {
        var jdbc = database();
        try {
            var sessionId = UUID.randomUUID().toString();
            var before = Instant.parse("2026-01-01T00:00:00Z");
            jdbc.update("INSERT INTO incident_session VALUES(?,?,?,?,?,?)", sessionId, "Phase limit", "DOWNSTREAM_LATENCY",
                "CREATED", Timestamp.from(before), Timestamp.from(before));
            var requestId = addEvidence(jdbc, sessionId, before, "BEFORE", "REQUEST_COUNT", 100.0);
            var latencyId = addEvidence(jdbc, sessionId, before, "BEFORE", "LATENCY_P95", 400.0);
            for (int index = 1; index <= 501; index++) {
                addEvidence(jdbc, sessionId, before.plusSeconds(index), "AFTER", "REQUEST_COUNT", 1.0);
            }

            var collector = new EvidenceCollector(jdbc, mock(TelemetryClient.class));
            assertThat(collector.list(sessionId)).hasSize(500).allMatch(item -> "AFTER".equals(item.phase()));
            var json = new JsonCodec(JsonMapper.builder().addModule(new JavaTimeModule()).build());
            var rca = new RcaService(new RuleBasedRcaProvider(), mock(OpenAiCompatibleRcaProvider.class), collector,
                jdbc, json, new SimpleMeterRegistry());
            var generated = rca.generate(sessionId);
            assertThat(generated.evidenceIds()).contains(requestId, latencyId);
            assertThat(generated.suspectedRootCause()).contains("downstream");

            var reloaded = rca.get(sessionId);
            assertThat(reloaded).isNotNull();
            assertThat(reloaded.evidenceIds()).contains(requestId, latencyId);
            List<Models.Evidence> visibleWithCitations = collector.includeCitations(sessionId, collector.list(sessionId), reloaded.evidenceIds());
            assertThat(visibleWithCitations).extracting(Models.Evidence::id).contains(requestId, latencyId);
            assertThatCode(() -> RcaValidator.validate(reloaded, visibleWithCitations)).doesNotThrowAnyException();
            assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM rca_report WHERE session_id=?", Integer.class, sessionId)).isEqualTo(1);
        } finally {
            closeDatabase();
        }
    }

    @Test
    void beforeLimitIsAppliedAfterSessionAndPhaseFilteringWithDeterministicOrdering() {
        var jdbc = database();
        try {
            var time = Instant.parse("2026-01-01T00:00:00Z");
            var session = addSession(jdbc, time);
            var other = addSession(jdbc, time);
            for (int i = 0; i < 501; i++) addEvidence(jdbc, session, time.plusSeconds(i), "BEFORE", "REQUEST_COUNT", (double)i);
            var foreign = addEvidence(jdbc, other, time.plusSeconds(999), "BEFORE", "REQUEST_COUNT", 999.0);
            var collector = new EvidenceCollector(jdbc, mock(TelemetryClient.class));
            var rows = collector.listForRca(session);
            assertThat(rows).hasSize(500).allMatch(e -> e.sessionId().equals(session) && e.phase().equals("BEFORE"));
            assertThat(rows.getFirst().value()).isEqualTo(500.0);
            assertThat(rows.getLast().value()).isEqualTo(1.0);
            assertThat(collector.includeCitations(session, List.of(), List.of(foreign))).isEmpty();
            var tied = addSession(jdbc, time);
            for (int i = 0; i < 3; i++) addEvidence(jdbc, tied, time, "BEFORE", "REQUEST_COUNT", 1.0);
            assertThat(collector.listForRca(tied)).extracting(Models.Evidence::id).isSorted();
        } finally { closeDatabase(); }
    }
    @Test
    void emptyBeforeEvidenceSavesAnUncertainReportEvenWithAfterRows() {
        var jdbc = database();
        try {
            var time = Instant.parse("2026-01-01T00:00:00Z");
            var session = addSession(jdbc, time);
            addEvidence(jdbc, session, time, "AFTER", "REQUEST_COUNT", 100.0);
            var collector = new EvidenceCollector(jdbc, mock(TelemetryClient.class));
            var rca = new RcaService(new RuleBasedRcaProvider(), mock(OpenAiCompatibleRcaProvider.class), collector,
                jdbc, new JsonCodec(JsonMapper.builder().addModule(new JavaTimeModule()).build()), new SimpleMeterRegistry());
            var report = rca.generate(session);
            assertThat(report.evidenceIds()).isEmpty();
            assertThat(report.confidence()).isZero();
            assertThat(rca.get(session).suspectedRootCause()).contains("Insufficient evidence");
        } finally { closeDatabase(); }
    }
    private static String addSession(JdbcTemplate jdbc, Instant time) {
        var id = UUID.randomUUID().toString();
        jdbc.update("INSERT INTO incident_session VALUES(?,?,?,?,?,?)", id, "Limit test", "DOWNSTREAM_LATENCY", "CREATED", Timestamp.from(time), Timestamp.from(time));
        return id;
    }
    private static String addEvidence(JdbcTemplate jdbc, String sessionId, Instant end, String phase, String type, Double value) {
        var id = UUID.randomUUID().toString();
        jdbc.update("INSERT INTO evidence(id,session_id,window_start,window_end,source,service,evidence_type,metric_value,unit,trace_id,explanation,phase) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)",
            id, sessionId, Timestamp.from(end), Timestamp.from(end), "test-source", "demo-api", type, value,
            "unit", null, "Observed test measurement", phase);
        return id;
    }
}
