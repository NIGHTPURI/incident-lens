CREATE TABLE product (
    id BIGINT NOT NULL PRIMARY KEY,
    category VARCHAR(32) NOT NULL,
    name VARCHAR(160) NOT NULL,
    price DECIMAL(12,2) NOT NULL,
    INDEX idx_product_category_id(category, id)
);
CREATE TABLE product_detail (
    product_id BIGINT NOT NULL PRIMARY KEY,
    description VARCHAR(1000) NOT NULL,
    CONSTRAINT fk_detail_product FOREIGN KEY (product_id) REFERENCES product(id)
);
CREATE TABLE purchase_order (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    idempotency_key VARCHAR(96) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    product_id BIGINT NOT NULL,
    quantity INT NOT NULL,
    created_at TIMESTAMP(6) NOT NULL,
    CONSTRAINT uq_order_idempotency UNIQUE(idempotency_key),
    CONSTRAINT fk_order_product FOREIGN KEY (product_id) REFERENCES product(id),
    CONSTRAINT ck_order_quantity CHECK(quantity BETWEEN 1 AND 100),
    INDEX idx_order_created(created_at)
);
CREATE TABLE outbox_event (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    aggregate_id VARCHAR(36) NOT NULL,
    payload JSON NOT NULL,
    created_at TIMESTAMP(6) NOT NULL,
    published_at TIMESTAMP(6) NULL,
    next_attempt_at TIMESTAMP(6) NOT NULL,
    attempt_count INT NOT NULL DEFAULT 0,
    lease_token VARCHAR(36) NULL,
    leased_until TIMESTAMP(6) NULL,
    last_error VARCHAR(120) NULL,
    CONSTRAINT fk_outbox_order FOREIGN KEY(aggregate_id) REFERENCES purchase_order(id),
    INDEX idx_outbox_due(published_at, next_attempt_at, created_at),
    INDEX idx_outbox_order(aggregate_id)
);
