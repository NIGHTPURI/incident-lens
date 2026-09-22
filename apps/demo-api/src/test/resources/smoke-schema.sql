CREATE TABLE IF NOT EXISTS product(id BIGINT PRIMARY KEY,category VARCHAR(32),name VARCHAR(160),price DECIMAL(12,2));
CREATE TABLE IF NOT EXISTS product_detail(product_id BIGINT PRIMARY KEY,description VARCHAR(1000));
CREATE TABLE IF NOT EXISTS purchase_order(id VARCHAR(36) PRIMARY KEY,idempotency_key VARCHAR(96) UNIQUE NOT NULL,product_id BIGINT NOT NULL,quantity INT NOT NULL,created_at TIMESTAMP(6) NOT NULL);
CREATE TABLE IF NOT EXISTS outbox_event(id VARCHAR(36) PRIMARY KEY,aggregate_id VARCHAR(36) NOT NULL,payload JSON NOT NULL,created_at TIMESTAMP(6) NOT NULL,published_at TIMESTAMP(6),next_attempt_at TIMESTAMP(6) NOT NULL,attempt_count INT DEFAULT 0,lease_token VARCHAR(36),leased_until TIMESTAMP(6),last_error VARCHAR(120));
MERGE INTO product KEY(id) VALUES(1,'books','Smoke book',10.00);
MERGE INTO product_detail KEY(product_id) VALUES(1,'Only a wiring fixture; real MySQL migrations are tested with Testcontainers.');
