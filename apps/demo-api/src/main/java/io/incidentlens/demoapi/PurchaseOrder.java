package io.incidentlens.demoapi;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "purchase_order")
public class PurchaseOrder {
    @Id @Column(length = 36) private String id;
    @Column(name = "idempotency_key", nullable = false, unique = true, length = 96) private String idempotencyKey;
    @Column(name = "product_id", nullable = false) private long productId;
    @Column(nullable = false) private int quantity;
    @Column(name = "created_at", nullable = false) private Instant createdAt;
    protected PurchaseOrder() { }
    public String getId() { return id; }
    public long getProductId() { return productId; }
    public int getQuantity() { return quantity; }
    public Instant getCreatedAt() { return createdAt; }
}
