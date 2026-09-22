package io.incidentlens.demoapi;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.incidentlens.common.OrderCreated;
import io.incidentlens.common.RequestContext;
import io.incidentlens.common.TraceContext;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.time.Instant;
import java.util.UUID;

@Service
public class OrderService {
    private final JdbcTemplate jdbc;
    private final OrderRepository orders;
    private final ObjectMapper mapper;
    public OrderService(JdbcTemplate jdbc, OrderRepository orders, ObjectMapper mapper) {
        this.jdbc = jdbc; this.orders = orders; this.mapper = mapper;
    }
    @Transactional
    public Result create(String key, long productId, int quantity) {
        if (key == null || !key.matches("[a-zA-Z0-9._:-]{1,96}")) throw new IllegalArgumentException("Invalid idempotency key");
        if (productId < 1 || quantity < 1 || quantity > 100) throw new IllegalArgumentException("Invalid order");
        Long productCount = jdbc.queryForObject("SELECT COUNT(*) FROM product WHERE id = ?", Long.class, productId);
        if (productCount == null || productCount == 0) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found");
        String id = UUID.randomUUID().toString();
        // A unique index serializes contenders. A current locking read also works under MySQL REPEATABLE READ.
        jdbc.update("INSERT INTO purchase_order(id,idempotency_key,product_id,quantity,created_at) VALUES(?,?,?,?,CURRENT_TIMESTAMP(6)) "
                + "ON DUPLICATE KEY UPDATE id=id", id, key, productId, quantity);
        PurchaseOrder order = orders.findByIdempotencyKey(key).orElseThrow();
        if (order.getProductId() != productId || order.getQuantity() != quantity)
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Idempotency key was already used for a different order");
        boolean created = id.equals(order.getId());
        if (created) {
            var context = RequestContext.current();
            var event = new OrderCreated(1, UUID.randomUUID().toString(), id, productId, quantity, context.sessionId(), context.phase(),
                    context.correlationId(), TraceContext.capture(), Instant.now());
            try {
                jdbc.update("INSERT INTO outbox_event(id,aggregate_id,payload,created_at,next_attempt_at) VALUES(?,?,?,CURRENT_TIMESTAMP(6),CURRENT_TIMESTAMP(6))",
                        event.eventId(), id, mapper.writeValueAsString(event));
            } catch (JsonProcessingException ex) { throw new IllegalStateException("Cannot serialize order event", ex); }
        }
        return new Result(OrderView.from(order), created);
    }
    @Transactional(readOnly = true)
    public OrderView get(String id) {
        return OrderView.from(orders.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Order not found")));
    }
    public record OrderView(String id, long productId, int quantity, Instant createdAt) {
        static OrderView from(PurchaseOrder order) { return new OrderView(order.getId(), order.getProductId(), order.getQuantity(), order.getCreatedAt()); }
    }
    public record Result(OrderView order, boolean created) { }
}
