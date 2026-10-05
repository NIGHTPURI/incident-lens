package io.incidentlens.control;

import com.fasterxml.jackson.databind.json.JsonMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.jdbc.core.JdbcTemplate;
import java.io.IOException;
import java.net.http.*;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.*;
import java.util.concurrent.*;
import static org.assertj.core.api.Assertions.*;
import static org.junit.jupiter.api.Assertions.assertTimeoutPreemptively;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/** Exercises the real provider/subscriber/service with HTTP delivery simulated in memory. */
class RcaProviderBoundaryTest {
    private final JsonCodec json = new JsonCodec(JsonMapper.builder().addModule(new JavaTimeModule()).build());
    private final HttpClient http = mock(HttpClient.class);
    private final List<Models.Evidence> evidence = List.of(EvidenceAndRcaTest.metric("traffic", "REQUEST_COUNT", 20.0),
        EvidenceAndRcaTest.metric("latency", "LATENCY_P95", 400.0));
    private final RcaResponseBodyTest.RecordingSubscription subscription = new RcaResponseBodyTest.RecordingSubscription();
    private final Duration timeout = Duration.ofMillis(100);
    private final OpenAiCompatibleRcaProvider provider = new OpenAiCompatibleRcaProvider(
        "https://provider.invalid/v1", "test-only-key", "test-model", json, http, timeout);

    @AfterEach void clearInterrupt() { Thread.interrupted(); }

    @Test void acceptsGroundedResponseAndPersistsWithoutFallback() {
        deliver(200, envelope("latency", "stop"), false);
        var fixture = service();
        var report = fixture.service().generate("session");
        assertThat(report.provider()).isEqualTo("openai-compatible");
        assertThat(report.evidenceIds()).containsExactly("latency");
        assertThat(fixture.meters().counter("incidentlens.rca.fallback").count()).isZero();
        verify(fixture.jdbc()).update(anyString(), eq("session"), eq(json.write(report)), any(java.sql.Timestamp.class));
        verify(http, times(1)).<String>sendAsync(any(), any());
    }

    @ParameterizedTest @ValueSource(ints = {200, 429, 503})
    void oversizedOrErrorResponseFallsBackAndPersistsOnlyValidatedRules(int status) {
        deliver(status, "x".repeat(65_537), false);
        assertFallback(service());
        assertThat(subscription.cancelled).isTrue();
        if (status != 200) assertThat(subscription.requested).isZero();
        verify(http, times(1)).<String>sendAsync(any(), any());
    }

    @Test void incompleteBodyReachesDeadlineCancelsAndFallsBack() {
        var pending = deliver(200, "{", true);
        var fixture = service();
        assertTimeoutPreemptively(Duration.ofSeconds(3), () -> assertFallback(fixture));
        assertThat(pending).isCancelled();
    }

    @Test void interruptedWaitCancelsRequestAndRestoresInterruptFlag() {
        var pending = deliver(200, "{", true);
        Thread.currentThread().interrupt();
        assertThatThrownBy(() -> provider.analyze(evidence)).hasMessage("Provider interrupted").hasNoCause();
        assertThat(Thread.currentThread().isInterrupted()).isTrue();
        assertThat(pending).isCancelled();
    }

    @Test void transportFailureUsesFallbackWithoutLeakingExceptionDetails() {
        when(http.<String>sendAsync(any(), any())).thenReturn(CompletableFuture.failedFuture(new IOException("sensitive-provider-detail")));
        assertThatThrownBy(() -> provider.analyze(evidence))
            .hasMessage("Provider failed or output did not satisfy the evidence contract").hasNoCause();
        assertFallback(service());
    }

    @ParameterizedTest @ValueSource(strings = {"invented-citation", "truncated", "malformed", "numeric-string", "duplicate-key", "extra-field", "trailing-json"})
    void invalidOutputNeverReachesPersistence(String mode) throws Exception {
        String body = envelope("latency", "stop");
        String content = json.mapper.readTree(body).path("choices").path(0).path("message").path("content").asText();
        body = switch (mode) {
            case "invented-citation" -> envelope("fake-id", "stop");
            case "truncated" -> envelope("latency", "length");
            case "malformed" -> "sensitive-provider-detail";
            case "numeric-string" -> wrap(content.replace("\"confidence\":0.6", "\"confidence\":\"0.6\""), "stop");
            case "duplicate-key" -> wrap(content.replace("\"confidence\":0.6", "\"confidence\":0.6,\"confidence\":0.9"), "stop");
            case "extra-field" -> wrap(content.replaceFirst("\\{", "{\"extra\":true,"), "stop");
            case "trailing-json" -> wrap(content + "{}", "stop");
            default -> throw new AssertionError(mode);
        };
        deliver(200, body, false);
        assertFallback(service());
    }

    @Test void inputOverExistingCharacterBudgetMakesNoHttpRequest() {
        var oversized = new Models.Evidence("large", "session", java.time.Instant.EPOCH, java.time.Instant.EPOCH,
            "test", "demo-api", "EVENT", null, "event", null, "x".repeat(100_001), "BEFORE");
        assertThatThrownBy(() -> provider.analyze(List.of(oversized))).isInstanceOf(IllegalStateException.class).hasNoCause();
        verifyNoInteractions(http);
    }

    @Test void validJsonAtExactWireBudgetStillSucceeds() {
        String body = envelope("latency", "stop");
        deliver(200, body + " ".repeat(65_536 - body.getBytes(StandardCharsets.UTF_8).length), false);
        assertThat(provider.analyze(evidence).provider()).isEqualTo("openai-compatible");
    }

    @Test void zeroTrafficStillRejectsConfidentProviderOutput() {
        deliver(200, envelope("latency", "stop"), false);
        assertThatThrownBy(() -> provider.analyze(List.of(EvidenceAndRcaTest.metric("latency", "LATENCY_P95", 400.0))))
            .isInstanceOf(IllegalStateException.class);
    }

    @Test void unconfiguredProviderMakesNoHttpRequest() {
        var disabled = new OpenAiCompatibleRcaProvider("https://provider.invalid/v1", "", "", json, http, timeout);
        assertThatThrownBy(() -> disabled.analyze(evidence)).hasMessage("RCA provider not configured");
        verifyNoInteractions(http);
    }

    private void assertFallback(Fixture fixture) {
        var report = fixture.service().generate("session");
        assertThat(report.provider()).isEqualTo("rule-based");
        assertThat(report.evidenceIds()).contains("traffic", "latency");
        assertThatCode(() -> RcaValidator.validate(report, evidence)).doesNotThrowAnyException();
        assertThat(fixture.meters().counter("incidentlens.rca.fallback").count()).isEqualTo(1);
        verify(fixture.jdbc()).update(anyString(), eq("session"), eq(json.write(report)), any(java.sql.Timestamp.class));
    }

    private Fixture service() {
        var collector = mock(EvidenceCollector.class); when(collector.listForRca("session")).thenReturn(evidence);
        var jdbc = mock(JdbcTemplate.class); var meters = new SimpleMeterRegistry();
        return new Fixture(new RcaService(new RuleBasedRcaProvider(), provider, collector, jdbc, json, meters), jdbc, meters);
    }

    @SuppressWarnings("unchecked")
    private CompletableFuture<HttpResponse<String>> deliver(int status, String response, boolean leaveOpen) {
        var pending = new CompletableFuture<HttpResponse<String>>();
        when(http.<String>sendAsync(any(), any())).thenAnswer(call -> {
            HttpRequest request = call.getArgument(0);
            assertThat(request.timeout()).contains(timeout);
            HttpResponse.BodyHandler<String> handler = call.getArgument(1);
            var receiver = handler.apply(RcaResponseBodyTest.info(status, Map.of()));
            receiver.getBody().whenComplete((body, error) -> {
                if (error != null) pending.completeExceptionally(error);
                else {
                    HttpResponse<String> result = mock(HttpResponse.class);
                    when(result.statusCode()).thenReturn(status); when(result.body()).thenReturn(body);
                    pending.complete(result);
                }
            });
            receiver.onSubscribe(subscription);
            if (!subscription.cancelled) receiver.onNext(List.of(ByteBuffer.wrap(response.getBytes(StandardCharsets.UTF_8))));
            if (!leaveOpen && !subscription.cancelled) receiver.onComplete();
            return pending;
        });
        return pending;
    }

    private String envelope(String citation, String finish) {
        return wrap(json.write(Map.of("summary", "Slow requests", "suspectedRootCause", "Possible downstream delay", "confidence", .6,
            "evidenceIds", List.of(citation), "impact", "Elevated observed latency", "recommendedActions", List.of("Inspect trace"),
            "uncertainties", List.of("No baseline"))), finish);
    }
    private String wrap(String content, String finish) {
        return json.write(Map.of("choices", List.of(Map.of("finish_reason", finish, "message", Map.of("content", content)))));
    }
    private record Fixture(RcaService service, JdbcTemplate jdbc, SimpleMeterRegistry meters) {}
}
