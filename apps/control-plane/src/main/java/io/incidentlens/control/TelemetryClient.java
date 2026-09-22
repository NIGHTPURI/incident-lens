package io.incidentlens.control;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.*;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.*;

@Component
class TelemetryClient {
    record ObservedEvent(Instant timestamp, String type, String explanation, String traceId, String correlationId) {}
    record Snapshot(String service, Instant observedAt, Map<String, Double> metrics, List<String> traceIds,
                    boolean available, List<ObservedEvent> events) {
        Snapshot(String service, Instant observedAt, Map<String, Double> metrics, List<String> traceIds, boolean available) {
            this(service, observedAt, metrics, traceIds, available, List.of());
        }
    }
    private final HttpClient client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(2)).build();
    private final JsonCodec json;
    private final Map<String, String> urls;
    TelemetryClient(JsonCodec json, @Value("${incidentlens.demo-api-url}") String api,
                    @Value("${incidentlens.demo-worker-url}") String worker) {
        this.json = json; this.urls = new LinkedHashMap<>(); urls.put("demo-api", api); urls.put("demo-worker", worker);
    }
    List<Snapshot> snapshots(String sessionId, String phase) {
        return urls.entrySet().stream().map(entry -> fetch(entry.getKey(), entry.getValue(), sessionId, phase)).toList();
    }
    private Snapshot fetch(String service, String base, String sessionId, String phase) {
        try {
            String query = "?sessionId=" + URLEncoder.encode(sessionId, StandardCharsets.UTF_8)
                    + "&phase=" + URLEncoder.encode(phase, StandardCharsets.UTF_8);
            HttpRequest request = HttpRequest.newBuilder(URI.create(base + "/internal/telemetry" + query))
                    .timeout(Duration.ofSeconds(3)).GET().build();
            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200 || response.body().length() > 131072) throw new IllegalStateException("Invalid telemetry response");
            JsonNode tree = json.mapper.readTree(response.body());
            Map<String, Double> metrics = new LinkedHashMap<>();
            tree.path("metrics").fields().forEachRemaining(e -> {
                if (e.getValue().isNumber() && Double.isFinite(e.getValue().doubleValue())) metrics.put(e.getKey(), e.getValue().doubleValue());
            });
            List<String> traces = new ArrayList<>();
            tree.path("traceIds").forEach(t -> { if (t.asText().matches("[a-fA-F0-9]{32}")) traces.add(t.asText()); });
            List<ObservedEvent> events = new ArrayList<>();
            for (JsonNode event : tree.path("events")) {
                if (events.size() >= 12) break;
                String type = event.path("type").asText();
                String explanation = event.path("explanation").asText();
                if (!type.matches("[A-Z_]{1,60}") || explanation.length() > 1000) continue;
                events.add(new ObservedEvent(Instant.parse(event.path("timestamp").asText()), type, explanation,
                    event.path("traceId").isTextual() ? event.path("traceId").asText() : null,
                    event.path("correlationId").isTextual() ? event.path("correlationId").asText() : null));
            }
            return new Snapshot(service, Instant.parse(tree.path("observedAt").asText()), metrics, traces.stream().limit(5).toList(), true, events);
        } catch (InterruptedException interrupted) {
            Thread.currentThread().interrupt();
            return new Snapshot(service, Instant.now(), Map.of(), List.of(), false);
        } catch (Exception unavailable) {
            return new Snapshot(service, Instant.now(), Map.of(), List.of(), false);
        }
    }
}
