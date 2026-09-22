package io.incidentlens.demoworker;

import io.incidentlens.common.OrderCreated;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.support.TransactionTemplate;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import static org.assertj.core.api.Assertions.*;

/** H2 verifies Spring wiring and transaction boundaries. Testcontainers verifies MySQL and Kafka. */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "spring.datasource.url=jdbc:h2:mem:worker-smoke;MODE=MySQL;DB_CLOSE_DELAY=-1", "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa", "spring.datasource.password=", "spring.flyway.enabled=false", "spring.sql.init.mode=always",
        "spring.sql.init.schema-locations=classpath:smoke-schema.sql", "spring.kafka.admin.auto-create=false", "spring.kafka.admin.fail-fast=false",
        "spring.kafka.listener.auto-startup=false", "incidentlens.worker.lag.enabled=false", "management.health.redis.enabled=false"})
class WorkerWiringSmokeTest {
    @Autowired FulfillmentService fulfillment;
    @Autowired JdbcTemplate jdbc;
    @Autowired TransactionTemplate transactions;
    @Autowired TestRestTemplate http;
    @Test void transactionRollsBackMarkerAndBusinessStateAndDuplicateIsSafe() {
        var event = new OrderCreated(1, UUID.randomUUID().toString(), UUID.randomUUID().toString(), 1, 2, "smoke", "BEFORE", "test", null, Instant.now());
        assertThatThrownBy(() -> transactions.execute(status -> { fulfillment.fulfill(event); throw new IllegalStateException("rollback probe"); })).isInstanceOf(IllegalStateException.class);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM processed_event", Long.class)).isZero();
        assertThat(fulfillment.fulfill(event)).isEqualTo(FulfillmentService.Result.PROCESSED);
        assertThat(fulfillment.fulfill(event)).isEqualTo(FulfillmentService.Result.DUPLICATE_EVENT);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM fulfillment", Long.class)).isEqualTo(1);
        assertThat(http.getForEntity("/internal/telemetry?sessionId=ALL&phase=ALL", Map.class).getStatusCode().value()).isEqualTo(200);
    }
}
