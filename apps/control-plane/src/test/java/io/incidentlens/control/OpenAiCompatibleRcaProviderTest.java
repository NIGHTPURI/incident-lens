package io.incidentlens.control;

import com.fasterxml.jackson.databind.json.JsonMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.*;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.*;
import static org.assertj.core.api.Assertions.*;

class OpenAiCompatibleRcaProviderTest {
    private HttpServer server;
    private String response;
    private int status;
    private OpenAiCompatibleRcaProvider provider;
    private final JsonCodec json = new JsonCodec(JsonMapper.builder().addModule(new JavaTimeModule()).build());
    @BeforeEach void start() throws Exception {
        status = 200;
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/v1/chat/completions", exchange -> {
            exchange.getRequestBody().readAllBytes();
            byte[] bytes = response.getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().set("Content-Type", "application/json");
            exchange.sendResponseHeaders(status, bytes.length);
            try (var body = exchange.getResponseBody()) { body.write(bytes); }
        });
        server.start();
        provider = new OpenAiCompatibleRcaProvider("http://127.0.0.1:" + server.getAddress().getPort() + "/v1", "test-only-key", "test-model", json);
    }
    @AfterEach void stop() { server.stop(0); }
    @Test void acceptsStructuredGroundedOutput() {
        response = envelope("e1", "stop");
        var result = provider.analyze(List.of(EvidenceAndRcaTest.metric("traffic", "REQUEST_COUNT", 20.0),
            EvidenceAndRcaTest.metric("e1", "LATENCY_P95", 400.0)));
        assertThat(result.evidenceIds()).containsExactly("e1");
        assertThat(result.provider()).isEqualTo("openai-compatible");
    }
    @Test void rejectsHallucinatedCitationTruncationAndServiceErrors() {
        var evidence = List.of(EvidenceAndRcaTest.metric("e1", "REQUEST_COUNT", 20.0));
        response = envelope("fake-id", "stop");
        assertThatThrownBy(() -> provider.analyze(evidence)).isInstanceOf(IllegalStateException.class);
        response = envelope("e1", "length");
        assertThatThrownBy(() -> provider.analyze(evidence)).isInstanceOf(IllegalStateException.class);
        status = 503; response = "provider debug details must not leak";
        assertThatThrownBy(() -> provider.analyze(evidence)).hasMessageNotContaining("debug details");
    }
    @Test void zeroTrafficCannotSupportPositiveConfidenceEvenWithAnExistingCitation() {
        response = envelope("e1", "stop");
        assertThatThrownBy(() -> provider.analyze(List.of(EvidenceAndRcaTest.metric("e1", "REQUEST_COUNT", 0.0))))
            .isInstanceOf(IllegalStateException.class);
    }
    @Test void rejectsTypeCoercionDuplicateKeysAndTrailingJson() throws Exception {
        var evidence = List.of(EvidenceAndRcaTest.metric("traffic", "REQUEST_COUNT", 20.0), EvidenceAndRcaTest.metric("e1", "LATENCY_P95", 400.0));
        String valid = json.mapper.readTree(envelope("e1", "stop")).path("choices").path(0).path("message").path("content").asText();
        for (String invalid : List.of(valid.replace("\"confidence\":0.6", "\"confidence\":null"),
            valid.replace("\"confidence\":0.6", "\"confidence\":\"0.6\""),
            valid.replace("\"Inspect trace\"", "123"), valid + "{}",
            valid.replace("\"confidence\":0.6", "\"confidence\":0.6,\"confidence\":0.9"))) {
            response = json.write(Map.of("choices", List.of(Map.of("finish_reason", "stop", "message", Map.of("content", invalid)))));
            assertThatThrownBy(() -> provider.analyze(evidence)).isInstanceOf(IllegalStateException.class);
        }
    }
    private String envelope(String evidenceId, String finish) {
        String content = json.write(Map.of("summary", "Slow requests", "suspectedRootCause", "Possible downstream delay",
                "confidence", .6, "evidenceIds", List.of(evidenceId), "impact", "Elevated observed latency",
                "recommendedActions", List.of("Inspect trace"), "uncertainties", List.of("No baseline")));
        return json.write(Map.of("choices", List.of(Map.of("finish_reason", finish, "message", Map.of("content", content)))));
    }
}
