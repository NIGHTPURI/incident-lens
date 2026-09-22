package io.incidentlens.common;

import java.time.Instant;

public record FaultState(String sessionId, Scenario scenario, boolean enabled, int parameter, Instant expiresAt) {
    public enum Scenario { DOWNSTREAM_LATENCY, DATABASE_DEGRADATION, KAFKA_SLOWDOWN, CACHE_DEGRADATION }
    public static FaultState inactive() { return new FaultState(null, null, false, 0, Instant.EPOCH); }
    public boolean active(Scenario expected, String requestSession) {
        return enabled && scenario == expected && expiresAt != null && expiresAt.isAfter(Instant.now())
            && (sessionId == null || sessionId.equals(requestSession));
    }
    public int boundedDelayMillis() { return Math.max(0, Math.min(parameter, 3000)); }
}
