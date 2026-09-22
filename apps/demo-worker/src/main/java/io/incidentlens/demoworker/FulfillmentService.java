package io.incidentlens.demoworker;

import io.incidentlens.common.OrderCreated;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.Map;
import java.util.UUID;

@Service
public class FulfillmentService {
    private final JdbcTemplate jdbc;
    public FulfillmentService(JdbcTemplate jdbc) { this.jdbc = jdbc; }
    @Transactional
    public Result fulfill(OrderCreated event) {
        event.validate();
        String fingerprint = event.orderId() + ":" + event.productId() + ":" + event.quantity();
        String deliveryToken = UUID.randomUUID().toString();
        // The upsert takes an exclusive lock: INSERT IGNORE followed by a lock upgrade can deadlock concurrent duplicates.
        // A persisted token distinguishes the insert from replay without relying on CLIENT_FOUND_ROWS driver semantics.
        jdbc.update("INSERT INTO processed_event(event_id,payload_fingerprint,delivery_token,processed_at) VALUES(?,?,?,CURRENT_TIMESTAMP(6)) "
                + "ON DUPLICATE KEY UPDATE event_id=event_id", event.eventId(), fingerprint, deliveryToken);
        Map<String, Object> marker = jdbc.queryForMap("SELECT payload_fingerprint,delivery_token FROM processed_event WHERE event_id=? FOR UPDATE", event.eventId());
        if (!fingerprint.equals(marker.get("payload_fingerprint"))) throw new IllegalArgumentException("Event ID reused with conflicting business data");
        if (!deliveryToken.equals(marker.get("delivery_token"))) return Result.DUPLICATE_EVENT;
        jdbc.update("INSERT INTO fulfillment(order_id,event_id,product_id,quantity,fulfilled_at) VALUES(?,?,?,?,CURRENT_TIMESTAMP(6)) "
                + "ON DUPLICATE KEY UPDATE order_id=order_id", event.orderId(), event.eventId(), event.productId(), event.quantity());
        Map<String, Object> existing = jdbc.queryForMap("SELECT event_id,product_id,quantity FROM fulfillment WHERE order_id=? FOR UPDATE", event.orderId());
        if (((Number) existing.get("product_id")).longValue() != event.productId() || ((Number) existing.get("quantity")).intValue() != event.quantity())
            throw new IllegalArgumentException("Order ID reused with conflicting business data");
        return event.eventId().equals(existing.get("event_id")) ? Result.PROCESSED : Result.DUPLICATE_ORDER;
    }
    public enum Result { PROCESSED, DUPLICATE_EVENT, DUPLICATE_ORDER }
}
