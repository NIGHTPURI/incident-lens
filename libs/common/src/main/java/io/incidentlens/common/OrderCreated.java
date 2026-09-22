package io.incidentlens.common;

import java.time.Instant;

/** Version 1 JSON; additive optional fields are compatible. Required-field changes need a new version. */
public record OrderCreated(int schemaVersion, String eventId, String orderId, long productId, int quantity,
                           String sessionId, String phase, String correlationId, String traceparent, Instant occurredAt) {
    public static final String TOPIC = "incidentlens.orders.v1";
    public static final String DLQ = "incidentlens.orders.v1.dlq";
    public void validate() {
        if (schemaVersion != 1 || !uuid(eventId) || !uuid(orderId) || productId < 1 || quantity < 1 || quantity > 100
                || occurredAt == null) throw new IllegalArgumentException("Unsupported or invalid order event");
    }
    private static boolean uuid(String value) {
        try { return value != null && java.util.UUID.fromString(value).toString().equals(value); }
        catch (IllegalArgumentException ex) { return false; }
    }
}
