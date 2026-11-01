package io.incidentlens.common;

import java.time.Instant;

public record FaultState(String sessionId, Scenario scenario, boolean enabled, int parameter, Instant expiresAt) {
    public enum Scenario { DOWNSTREAM_LATENCY, DATABASE_DEGRADATION, KAFKA_SLOWDOWN, CACHE_DEGRADATION }
    public static FaultState inactive() { return new FaultState(null, null, false, 0, Instant.EPOCH); }
    public boolean active(Scenario expected, String requestSession) {
        // Missing ownership is invalid state, never permission for a global fault.
        return enabled && expected != null && scenario == expected
            && expiresAt != null && expiresAt.isAfter(Instant.now())
            && sessionId != null && !sessionId.isBlank() && sessionId.equals(requestSession);
    }
    public int boundedDelayMillis() { return Math.max(0, Math.min(parameter, 3000)); }
}
