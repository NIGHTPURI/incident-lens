package io.incidentlens.control;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.Instant;
import java.util.List;
import java.util.Map;

/** Public API values are immutable; persistence entities never escape controllers. */
public final class Models {
    private Models() {}
    public enum Scenario { DOWNSTREAM_LATENCY, DATABASE_DEGRADATION, KAFKA_SLOWDOWN, CACHE_DEGRADATION }
    public enum Phase { BEFORE, AFTER }
    public record CreateSession(@NotBlank @Size(max = 120) String name, @NotNull Scenario scenario) {}
    public record Session(String id, String name, Scenario scenario, String status, Instant createdAt, Instant updatedAt) {}
    public record FaultCommand(@NotNull Boolean enabled, @NotNull @Min(0) @Max(2000) Integer parameter) {}
    public record FaultState(String sessionId, Scenario scenario, boolean enabled, int parameter, Instant expiresAt) {}
    public record Activation(boolean enabled, int parameter, Instant occurredAt) {}
    public record Evidence(String id, String sessionId, Instant windowStart, Instant windowEnd,
                           String source, String service, String type, Double value, String unit,
                           String traceId, String explanation, String phase) {}
    public record Report(String summary, String suspectedRootCause, double confidence, List<String> evidenceIds,
                         String impact, List<String> recommendedActions, List<String> uncertainties,
                         String provider, Instant generatedAt) {}
    public record Workload(@Min(1) @Max(50) int vus, @Min(5) @Max(300) int durationSeconds) {}
    public record StartRun(@NotNull Phase phase) {}
    public record CompleteRun(@NotNull @Min(0) Long requestCount, @NotNull @Min(0) Long errorCount,
                              @NotNull @DecimalMin("0.001") @DecimalMax("600.0") Double durationSeconds,
                              @NotNull @DecimalMin("0.0") Double p50Ms, @NotNull @DecimalMin("0.0") Double p95Ms,
                              @NotNull @DecimalMin("0.0") Double p99Ms, @Valid @NotNull Workload workload) {}
    public record Experiment(String id, String sessionId, String status, Workload workload,
                             Map<String, Double> before, Map<String, Double> after, Instant createdAt) {}
    public record SessionDetail(Session session, List<Activation> activations, List<Evidence> evidence,
                                Report report, List<Experiment> experiments) {}
    public record ServiceHealth(String name, String status) {}
    public record Overview(List<ServiceHealth> services, Map<String, Double> metrics, FaultState activeFault) {}
}
