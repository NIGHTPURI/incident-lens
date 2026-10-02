package io.incidentlens.control;

import com.fasterxml.jackson.databind.json.JsonMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.Test;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.embedded.*;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import java.net.http.*;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.time.*;
import java.util.*;
import java.util.concurrent.atomic.AtomicReference;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class RcaReportFlowTest {
    @Test @SuppressWarnings("unchecked")
    void generateThenProviderFailureStillReturnsAndReloadsPersistedCitedReport() throws Exception {
        // In-memory H2 and servlet dispatch; no listening server, credentials or paid API.
        var database = new EmbeddedDatabaseBuilder().setType(EmbeddedDatabaseType.H2).generateUniqueName(true)
            .addScript("db/migration/V1__control_plane.sql").build();
        try {
            var jdbc = new JdbcTemplate(database);
            jdbc.execute("SET MODE MySQL");
            var json = new JsonCodec(JsonMapper.builder().addModule(new JavaTimeModule()).build());
            var session = new SessionEntity(new Models.CreateSession("RCA response budget", Models.Scenario.DOWNSTREAM_LATENCY));
            jdbc.update("INSERT INTO incident_session VALUES(?,?,?,?,?,?)", session.id, session.name, session.scenario.name(),
                session.status, java.sql.Timestamp.from(session.createdAt), java.sql.Timestamp.from(session.updatedAt));
            var sessions = mock(SessionRepository.class); when(sessions.findById(session.id)).thenReturn(Optional.of(session));
            var telemetry = mock(TelemetryClient.class);
            when(telemetry.snapshots(session.id, "BEFORE")).thenReturn(List.of(new TelemetryClient.Snapshot(
                "demo-api", Instant.now(), Map.of("requestCount", 20.0, "p95Ms", 400.0), List.of(), true)));
            var evidence = new EvidenceCollector(jdbc, telemetry);
            var collected = evidence.collect(session.id, Instant.EPOCH, "BEFORE");
            String citation = collected.stream().filter(e -> e.type().equals("LATENCY_P95")).findFirst().orElseThrow().id();
            String content = json.write(Map.of("summary", "Observed latency", "suspectedRootCause", "Possible downstream delay",
                "confidence", .6, "evidenceIds", List.of(citation), "impact", "Slow requests",
                "recommendedActions", List.of("Inspect trace"), "uncertainties", List.of("No baseline")));
            var wireBody = new AtomicReference<>(json.write(Map.of("choices", List.of(Map.of(
                "finish_reason", "stop", "message", Map.of("content", content))))));
            var http = mock(HttpClient.class);
            when(http.<String>sendAsync(any(), any())).thenAnswer(call -> {
                HttpResponse.BodyHandler<String> handler = call.getArgument(1);
                var receiver = handler.apply(RcaResponseBodyTest.info(200, Map.of()));
                receiver.onSubscribe(new RcaResponseBodyTest.RecordingSubscription());
                receiver.onNext(List.of(ByteBuffer.wrap(wireBody.get().getBytes(StandardCharsets.UTF_8))));
                receiver.onComplete();
                return receiver.getBody().thenApply(body -> {
                    HttpResponse<String> response = mock(HttpResponse.class);
                    when(response.body()).thenReturn(body); when(response.statusCode()).thenReturn(200);
                    return response;
                }).toCompletableFuture();
            });
            var provider = new OpenAiCompatibleRcaProvider("https://provider.invalid/v1", "test-only-key", "test-model", json, http, Duration.ofSeconds(1));
            var meters = new SimpleMeterRegistry();
            var rca = new RcaService(new RuleBasedRcaProvider(), provider, evidence, jdbc, json, meters);
            var incidents = new IncidentService(sessions, mock(ExperimentRepository.class), mock(LabLockRepository.class),
                mock(FaultCoordinator.class), evidence, rca, jdbc, telemetry, json);
            var mvc = MockMvcBuilders.standaloneSetup(new IncidentController(incidents)).setControllerAdvice(new ApiErrors())
                .setMessageConverters(new MappingJackson2HttpMessageConverter(json.mapper)).build();

            mvc.perform(post("/api/sessions/{id}/rca", session.id)).andExpect(status().isOk())
                .andExpect(jsonPath("$.provider").value("openai-compatible"));
            wireBody.set("x".repeat(65_537));
            mvc.perform(post("/api/sessions/{id}/rca", session.id)).andExpect(status().isOk())
                .andExpect(jsonPath("$.provider").value("rule-based"));
            mvc.perform(get("/api/sessions/{id}", session.id)).andExpect(status().isOk())
                .andExpect(jsonPath("$.report.provider").value("rule-based"))
                .andExpect(jsonPath("$.report.evidenceIds").isNotEmpty());
            var stored = rca.get(session.id);
            assertThat(stored.evidenceIds()).contains(citation);
            assertThatCode(() -> RcaValidator.validate(stored, collected)).doesNotThrowAnyException();
            assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM rca_report", Integer.class)).isEqualTo(1);
            assertThat(meters.counter("incidentlens.rca.fallback").count()).isEqualTo(1);
        } finally { database.shutdown(); }
    }
}
