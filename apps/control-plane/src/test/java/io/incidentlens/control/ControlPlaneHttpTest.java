package io.incidentlens.control;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.*;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.atomic.AtomicReference;
import static org.mockito.Mockito.*;
import static org.assertj.core.api.Assertions.*;

/** Runs the real HTTP/controller/JPA/Flyway lifecycle. H2 validates local behavior, not MySQL equivalence. */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
    "spring.datasource.url=jdbc:h2:mem:control;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
    "spring.datasource.driver-class-name=org.h2.Driver", "spring.datasource.username=sa", "spring.datasource.password=",
    "spring.jpa.database-platform=org.hibernate.dialect.H2Dialect", "management.health.redis.enabled=false",
    "incidentlens.rca.api-key=", "incidentlens.rca.model=", "incidentlens.lab.reconcile-ms=3600000"
})
class ControlPlaneHttpTest {
    @Autowired TestRestTemplate http;
    @Autowired org.springframework.jdbc.core.JdbcTemplate jdbc;
    @Autowired IncidentService incidents;
    @MockitoBean FaultCoordinator faults;
    @MockitoBean TelemetryClient telemetry;
    @Test void completeExperimentPersistsEvidenceRejectsMismatchesAndCitesRca() {
        AtomicReference<Models.FaultState> active = new AtomicReference<>();
        when(faults.current()).thenAnswer(call -> active.get());
        when(faults.apply(any(), any())).thenAnswer(call -> {
            SessionEntity session = call.getArgument(0); Models.FaultCommand cmd = call.getArgument(1);
            var state = new Models.FaultState(session.id, session.scenario, cmd.enabled(), cmd.parameter(), Instant.now().plusSeconds(900));
            active.set(cmd.enabled() ? state : null); return state;
        });
        var empty = List.of(new TelemetryClient.Snapshot("demo-api", Instant.now(), Map.of("requestCount", 0.0), List.of(), true));
        var measured = List.of(new TelemetryClient.Snapshot("demo-api", Instant.now(),
            Map.of("requestCount", 100.0, "p95Ms", 450.0, "dbQueryP95Ms", 2.0, "cacheHitRate", .9), List.of(), true));
        when(telemetry.snapshots(anyString(), anyString())).thenReturn(empty).thenReturn(measured).thenReturn(empty).thenReturn(measured);
        var created = http.postForEntity("/api/sessions", new Models.CreateSession("HTTP lifecycle", Models.Scenario.DOWNSTREAM_LATENCY), Models.Session.class);
        assertThat(created.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        var session = created.getBody();
        var experiment = http.postForObject("/api/sessions/" + session.id() + "/experiments", new Models.Workload(2, 20), Models.Experiment.class);
        String path = "/api/experiments/" + experiment.id();
        assertThat(http.postForEntity(path + "/runs", new Models.StartRun(Models.Phase.BEFORE), String.class).getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        http.put("/api/sessions/" + session.id() + "/fault", new Models.FaultCommand(true, 400));
        assertThat(http.postForEntity(path + "/runs", new Models.StartRun(Models.Phase.BEFORE), String.class).getStatusCode()).isEqualTo(HttpStatus.OK);
        var mismatch = new Models.CompleteRun(100L, 0L, 20.0, 100.0, 200.0, 300.0, new Models.Workload(3, 20));
        assertThat(http.postForEntity(path + "/runs/BEFORE/complete", mismatch, String.class).getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        var before = http.postForEntity(path + "/runs/BEFORE/complete", ExperimentMeasurementTest.run(100, 3, 20, 100, 450, 600), Models.Experiment.class);
        assertThat(before.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(before.getBody().before().get("errorCount")).isEqualTo(3.0);
        var report = http.postForObject("/api/sessions/" + session.id() + "/rca", null, Models.Report.class);
        assertThat(report.provider()).isEqualTo("rule-based");
        assertThat(report.evidenceIds()).isNotEmpty();
        http.put("/api/sessions/" + session.id() + "/fault", new Models.FaultCommand(false, 400));
        assertThat(http.postForEntity(path + "/runs", new Models.StartRun(Models.Phase.AFTER), String.class).getStatusCode()).isEqualTo(HttpStatus.OK);
        var after = http.postForObject(path + "/runs/AFTER/complete", ExperimentMeasurementTest.run(200, 0, 20, 10, 20, 30), Models.Experiment.class);
        assertThat(after.status()).isEqualTo("COMPLETE");
        assertThat(after.after().get("throughput")).isEqualTo(10.0);
        assertThat(http.postForEntity(path + "/runs", new Models.StartRun(Models.Phase.AFTER), String.class).getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        var detail = http.getForObject("/api/sessions/" + session.id(), Models.SessionDetail.class);
        assertThat(detail.evidence()).extracting(Models.Evidence::id).containsAll(report.evidenceIds());
        assertThat(detail.activations()).hasSize(2);
        assertThat(detail.experiments().getFirst().status()).isEqualTo("COMPLETE");
    }
    @Test void invalidRequestsReturnSafeProblemDetails() {
        var invalid = http.postForEntity("/api/sessions", Map.of("name", "", "scenario", "made-up"), String.class);
        assertThat(invalid.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(invalid.getBody()).contains("detail").doesNotContain("stackTrace", "password");
        assertThat(http.getForEntity("/api/sessions?page=-1", String.class).getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(http.exchange("/api/sessions/missing/fault", HttpMethod.PUT, new HttpEntity<>(Map.of()), String.class)
            .getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(http.postForEntity("/api/experiments/missing/runs/BEFORE/complete",
            Map.of("requestCount", 5, "durationSeconds", 20, "workload", Map.of("vus", 2, "durationSeconds", 20)), String.class)
            .getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }
    @Test void rejectsAlreadyUsedTelemetryPhase() {
        var session = http.postForObject("/api/sessions", new Models.CreateSession("Dirty scope", Models.Scenario.CACHE_DEGRADATION), Models.Session.class);
        var experiment = http.postForObject("/api/sessions/" + session.id() + "/experiments", new Models.Workload(2, 20), Models.Experiment.class);
        when(faults.current()).thenReturn(new Models.FaultState(session.id(), session.scenario(), true, 0, Instant.now().plusSeconds(900)));
        when(telemetry.snapshots(eq(session.id()), eq("BEFORE"))).thenReturn(List.of(new TelemetryClient.Snapshot("demo-api", Instant.now(),
            Map.of("requestCount", 1.0), List.of(), true)));
        var result = http.postForEntity("/api/experiments/" + experiment.id() + "/runs", new Models.StartRun(Models.Phase.BEFORE), String.class);
        assertThat(result.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(result.getBody()).contains("fresh incident session");
    }
    @Test void expiredLeaseMarksItsOwnerAbortedAndReleasesLab() {
        var session = http.postForObject("/api/sessions", new Models.CreateSession("Expired run", Models.Scenario.CACHE_DEGRADATION), Models.Session.class);
        var experiment = http.postForObject("/api/sessions/" + session.id() + "/experiments", new Models.Workload(2, 20), Models.Experiment.class);
        jdbc.update("UPDATE experiment SET status='BEFORE_RUNNING' WHERE id=?", experiment.id());
        jdbc.update("UPDATE lab_lock SET experiment_id=?,phase='BEFORE',lease_until=? WHERE id=1", experiment.id(), java.sql.Timestamp.from(Instant.now().minusSeconds(10)));
        incidents.reconcileExpiredRun();
        assertThat(http.getForObject("/api/experiments/" + experiment.id(), Models.Experiment.class).status()).isEqualTo("ABORTED");
        assertThat(jdbc.queryForObject("SELECT experiment_id FROM lab_lock WHERE id=1", String.class)).isNull();
    }
    @Test void reportCitationsRemainVisibleBeyondRecentEvidenceLimit() {
        var session = http.postForObject("/api/sessions", new Models.CreateSession("Citation retention", Models.Scenario.DOWNSTREAM_LATENCY), Models.Session.class);
        when(telemetry.snapshots(eq(session.id()), eq("BEFORE"))).thenReturn(List.of(new TelemetryClient.Snapshot("demo-api", Instant.now(),
            Map.of("requestCount", 20.0, "p95Ms", 450.0), List.of(), true)));
        http.postForEntity("/api/sessions/" + session.id() + "/evidence", null, String.class);
        var report = http.postForObject("/api/sessions/" + session.id() + "/rca", null, Models.Report.class);
        var later = java.sql.Timestamp.from(Instant.now().plusSeconds(1));
        List<Object[]> rows = new ArrayList<>();
        for (int index = 0; index < 501; index++) rows.add(new Object[]{UUID.randomUUID().toString(), session.id(), later, later});
        jdbc.batchUpdate("INSERT INTO evidence(id,session_id,window_start,window_end,source,service,evidence_type,unit,explanation,phase) "
            + "VALUES(?,?,?,?,'fixture','demo-api','MARKER','event','Synthetic retention test event','BEFORE')", rows);
        var detail = http.getForObject("/api/sessions/" + session.id(), Models.SessionDetail.class);
        assertThat(detail.evidence()).hasSizeGreaterThan(500);
        assertThat(detail.evidence()).extracting(Models.Evidence::id).containsAll(report.evidenceIds());
    }
}
