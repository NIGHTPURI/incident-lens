package io.incidentlens.control;

import com.fasterxml.jackson.databind.json.JsonMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpServer;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.embedded.*;
import java.io.IOException;
import java.net.*;
import java.net.http.HttpClient;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.*;
import java.util.concurrent.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

/** Real loopback HTTP/1.1 tests. Socket denial is a failure, never a silent skip. */
@Timeout(15)
class RcaHttpTransportTest {
    private final JsonCodec json = new JsonCodec(JsonMapper.builder().addModule(new JavaTimeModule()).build());
    private final List<Models.Evidence> evidence = List.of(EvidenceAndRcaTest.metric("traffic", "REQUEST_COUNT", 20.0),
        EvidenceAndRcaTest.metric("latency", "LATENCY_P95", 400.0));
    private final CompletableFuture<Void> disconnected = new CompletableFuture<>();
    private volatile HttpHandler reply;
    private HttpServer server;
    private ExecutorService executor;
    private HttpClient http;

    @BeforeEach void start() throws IOException {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        executor = Executors.newCachedThreadPool();
        server.setExecutor(executor);
        server.createContext("/v1/chat/completions", exchange -> {
            try (exchange) {
                exchange.getRequestBody().readAllBytes();
                exchange.getResponseHeaders().set("Content-Type", "application/json; charset=utf-8");
                reply.handle(exchange);
            } catch (IOException cancelled) {
                // Assertions await this before teardown: server.stop() cannot make them pass.
                disconnected.complete(null);
            }
        });
        server.start();
        http = HttpClient.newBuilder().version(HttpClient.Version.HTTP_1_1).connectTimeout(Duration.ofSeconds(2))
            .proxy(new ProxySelector() {
                public List<Proxy> select(URI uri) { return List.of(Proxy.NO_PROXY); }
                public void connectFailed(URI uri, SocketAddress address, IOException failure) { }
            }).build();
    }

    @AfterEach void stop() throws InterruptedException {
        if (http != null) http.shutdownNow();
        if (server != null) server.stop(0);
        if (executor != null) { executor.shutdownNow(); executor.awaitTermination(2, TimeUnit.SECONDS); }
    }

    @Test void acceptsNormalGroundedReport() {
        byte[] body = envelope().getBytes(StandardCharsets.UTF_8);
        reply = exchange -> send(exchange, body, false);
        assertThat(provider(Duration.ofSeconds(5)).analyze(evidence).evidenceIds()).containsExactly("latency");
    }

    @ParameterizedTest @ValueSource(booleans = {false, true})
    void acceptsExactly65536BytesWithFixedOrChunkedLength(boolean chunked) {
        String body = envelope();
        byte[] exact = (body + " ".repeat(65_536 - body.getBytes(StandardCharsets.UTF_8).length)).getBytes(StandardCharsets.UTF_8);
        assertThat(exact).hasSize(65_536);
        reply = exchange -> send(exchange, exact, chunked);
        assertThat(provider(Duration.ofSeconds(5)).analyze(evidence).provider()).isEqualTo("openai-compatible");
    }

    @Test void declared65537BytesIsRejectedBeforeTheServerSendsBody() throws Exception {
        var releaseBody = new CountDownLatch(1);
        reply = exchange -> {
            exchange.sendResponseHeaders(200, 65_537);
            await(releaseBody);
            exchange.getResponseBody().write(new byte[65_537]);
        };
        var call = executor.submit(() -> provider(Duration.ofSeconds(10)).analyze(evidence));
        try {
            // The server has not sent any body; a 10-second timeout cannot explain a <3-second result.
            assertThatThrownBy(() -> call.get(3, TimeUnit.SECONDS)).isInstanceOf(ExecutionException.class)
                .hasCauseInstanceOf(IllegalStateException.class);
        } finally { releaseBody.countDown(); call.cancel(true); }
    }

    @Test void chunkedOverflowClosesTheConnectionBeforeEndOfBody() throws Exception {
        reply = exchange -> {
            exchange.sendResponseHeaders(200, 0);
            exchange.getResponseBody().write(new byte[65_536]);
            exchange.getResponseBody().flush();
            exchange.getResponseBody().write(1);
            exchange.getResponseBody().flush();
            probeDisconnectedPeer(exchange);
        };
        assertProviderFailure(provider(Duration.ofSeconds(5)));
        disconnected.get(3, TimeUnit.SECONDS);
    }

    @ParameterizedTest @ValueSource(ints = {429, 503})
    void errorStatusCancelsAnUnfinishedResponse(int status) throws Exception {
        reply = exchange -> {
            exchange.sendResponseHeaders(status, 0);
            probeDisconnectedPeer(exchange);
        };
        assertProviderFailure(provider(Duration.ofSeconds(5)));
        disconnected.get(3, TimeUnit.SECONDS);
    }

    @ParameterizedTest @ValueSource(booleans = {false, true})
    void timeoutCancelsDelayedHeadersOrStalledBody(boolean headersSent) throws Exception {
        var arrived = new CountDownLatch(1);
        var release = new CountDownLatch(1);
        reply = exchange -> {
            if (headersSent) {
                exchange.sendResponseHeaders(200, 0);
                exchange.getResponseBody().write('{');
                exchange.getResponseBody().flush();
            }
            arrived.countDown();
            await(release);
            if (!headersSent) exchange.sendResponseHeaders(200, 0);
            probeDisconnectedPeer(exchange);
        };
        var call = executor.submit(() -> provider(Duration.ofSeconds(1)).analyze(evidence));
        try {
            assertThat(arrived.await(3, TimeUnit.SECONDS)).isTrue();
            assertThatThrownBy(() -> call.get(3, TimeUnit.SECONDS)).isInstanceOf(ExecutionException.class)
                .hasCauseInstanceOf(IllegalStateException.class);
        } finally { release.countDown(); call.cancel(true); }
        disconnected.get(3, TimeUnit.SECONDS);
    }

    @Test void realHttpFailureStillPersistsAndReloadsFallback() {
        var database = new EmbeddedDatabaseBuilder().setType(EmbeddedDatabaseType.H2).generateUniqueName(true)
            .addScript("db/migration/V1__control_plane.sql").build();
        try {
            var jdbc = new JdbcTemplate(database); jdbc.execute("SET MODE MySQL");
            jdbc.update("INSERT INTO incident_session VALUES(?,?,?,'CREATED',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)",
                "session", "HTTP fallback", "DOWNSTREAM_LATENCY");
            var collector = mock(EvidenceCollector.class); when(collector.listForRca("session")).thenReturn(evidence);
            var meters = new SimpleMeterRegistry();
            var rca = new RcaService(new RuleBasedRcaProvider(), provider(Duration.ofSeconds(5)), collector, jdbc, json, meters);
            reply = exchange -> send(exchange, envelope().getBytes(StandardCharsets.UTF_8), false);
            assertThat(rca.generate("session").provider()).isEqualTo("openai-compatible");
            reply = exchange -> { exchange.sendResponseHeaders(503, 0); probeDisconnectedPeer(exchange); };
            var report = rca.generate("session");
            assertThat(report.provider()).isEqualTo("rule-based");
            assertThat(rca.get("session")).isEqualTo(report);
            assertThat(report.evidenceIds()).contains("traffic", "latency");
            assertThatCode(() -> RcaValidator.validate(report, evidence)).doesNotThrowAnyException();
            assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM rca_report", Integer.class)).isEqualTo(1);
            assertThat(meters.counter("incidentlens.rca.fallback").count()).isEqualTo(1);
        } finally { database.shutdown(); }
    }

    private OpenAiCompatibleRcaProvider provider(Duration timeout) {
        return new OpenAiCompatibleRcaProvider("http://127.0.0.1:" + server.getAddress().getPort() + "/v1",
            "test-only-key", "test-model", json, http, timeout);
    }
    private void assertProviderFailure(OpenAiCompatibleRcaProvider provider) {
        assertThatThrownBy(() -> provider.analyze(evidence))
            .hasMessage("Provider failed or output did not satisfy the evidence contract").hasNoCause();
    }
    private static void send(HttpExchange exchange, byte[] bytes, boolean chunked) throws IOException {
        exchange.sendResponseHeaders(200, chunked ? 0 : bytes.length);
        // Deliberately split the body instead of depending on a single socket write.
        for (int offset = 0; offset < bytes.length; offset += 1024) {
            exchange.getResponseBody().write(bytes, offset, Math.min(1024, bytes.length - offset));
            exchange.getResponseBody().flush();
        }
    }
    private static void probeDisconnectedPeer(HttpExchange exchange) throws IOException {
        byte[] chunk = new byte[8192];
        // Bounded writes detect a closed client; no claim that only 64 KiB crosses the TCP stack.
        for (int attempt = 0; attempt < 256; attempt++) {
            exchange.getResponseBody().write(chunk);
            exchange.getResponseBody().flush();
            try { Thread.sleep(5); }
            catch (InterruptedException interrupted) { Thread.currentThread().interrupt(); return; }
        }
    }
    private static void await(CountDownLatch latch) throws IOException {
        try { if (!latch.await(8, TimeUnit.SECONDS)) throw new IOException("Test did not release server"); }
        catch (InterruptedException interrupted) { Thread.currentThread().interrupt(); throw new IOException("Test server interrupted"); }
    }
    private String envelope() {
        String content = json.write(Map.of("summary", "관측된 지연", "suspectedRootCause", "Possible downstream delay", "confidence", .6,
            "evidenceIds", List.of("latency"), "impact", "Slow requests", "recommendedActions", List.of("Inspect trace"),
            "uncertainties", List.of("No baseline")));
        return json.write(Map.of("choices", List.of(Map.of("finish_reason", "stop", "message", Map.of("content", content)))));
    }
}
