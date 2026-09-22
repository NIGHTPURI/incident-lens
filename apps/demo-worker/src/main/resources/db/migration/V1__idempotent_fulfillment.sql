CREATE TABLE processed_event (
    event_id VARCHAR(36) NOT NULL PRIMARY KEY,
    payload_fingerprint VARCHAR(100) NOT NULL,
    delivery_token VARCHAR(36) NOT NULL,
    processed_at TIMESTAMP(6) NOT NULL,
    INDEX idx_processed_at(processed_at)
);
CREATE TABLE fulfillment (
    order_id VARCHAR(36) NOT NULL PRIMARY KEY,
    event_id VARCHAR(36) NOT NULL UNIQUE,
    product_id BIGINT NOT NULL,
    quantity INT NOT NULL,
    fulfilled_at TIMESTAMP(6) NOT NULL,
    CONSTRAINT fk_fulfillment_event FOREIGN KEY(event_id) REFERENCES processed_event(event_id),
    CONSTRAINT ck_fulfillment_quantity CHECK(quantity BETWEEN 1 AND 100),
    INDEX idx_fulfilled_at(fulfilled_at)
);
