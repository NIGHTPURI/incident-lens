package io.incidentlens.demoapi;

import io.incidentlens.common.FaultState;
import io.incidentlens.common.FaultStore;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import java.util.Map;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

/** H2 exercises HTTP wiring and shared transactions, not MySQL dialect/locking correctness. */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "spring.datasource.url=jdbc:h2:mem:api-smoke;MODE=MySQL;DB_CLOSE_DELAY=-1", "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa", "spring.datasource.password=", "spring.jpa.hibernate.ddl-auto=none", "spring.flyway.enabled=false",
        "spring.sql.init.mode=always", "spring.sql.init.schema-locations=classpath:smoke-schema.sql",
        "spring.kafka.admin.auto-create=false", "spring.kafka.admin.fail-fast=false", "incidentlens.outbox.enabled=false",
        "management.health.redis.enabled=false"})
class ApiHttpSmokeTest {
    @Autowired TestRestTemplate http;
    @Autowired JdbcTemplate jdbc;
    @MockitoBean FaultStore faults;
    @BeforeEach void setup() { when(faults.current()).thenReturn(FaultState.inactive()); jdbc.update("DELETE FROM outbox_event"); jdbc.update("DELETE FROM purchase_order"); }
    @Test void realHttpCreatesIdempotentOrderAndAtomicOutboxThenRejectsConflictingReuse() {
        HttpHeaders headers = new HttpHeaders(); headers.set("Idempotency-Key", "http-smoke"); headers.set("X-Incident-Id", "smoke"); headers.set("X-Experiment-Phase", "BEFORE");
        var request = new HttpEntity<>(Map.of("productId", 1, "quantity", 2), headers);
        var first = http.exchange("/api/orders", HttpMethod.POST, request, OrderService.OrderView.class);
        var repeat = http.exchange("/api/orders", HttpMethod.POST, request, OrderService.OrderView.class);
        assertThat(first.getStatusCode().value()).isEqualTo(201); assertThat(repeat.getStatusCode().value()).isEqualTo(200);
        assertThat(first.getBody().id()).isEqualTo(repeat.getBody().id());
        assertThat(repeat.getHeaders().getFirst("Idempotency-Replayed")).isEqualTo("true");
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM purchase_order", Long.class)).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM outbox_event", Long.class)).isEqualTo(1);
        var conflict = http.exchange("/api/orders", HttpMethod.POST, new HttpEntity<>(Map.of("productId", 1, "quantity", 3), headers), Map.class);
        assertThat(conflict.getStatusCode().value()).isEqualTo(409);
        assertThat(http.getForEntity("/api/orders/" + first.getBody().id(), Map.class).getStatusCode().value()).isEqualTo(200);
    }
    @Test void invalidQuantityAndOversizedBodyAreRejectedWithoutDatabaseWrites() {
        HttpHeaders headers = new HttpHeaders(); headers.set("Idempotency-Key", "invalid");
        var invalid = http.exchange("/api/orders", HttpMethod.POST, new HttpEntity<>(Map.of("productId", 1, "quantity", -1), headers), Map.class);
        assertThat(invalid.getStatusCode().value()).isEqualTo(400);
        headers.setContentType(org.springframework.http.MediaType.APPLICATION_JSON);
        var large = http.exchange("/api/orders", HttpMethod.POST, new HttpEntity<>("{\"padding\":\"" + "x".repeat(33000) + "\"}", headers), Map.class);
        assertThat(large.getStatusCode().value()).isEqualTo(413);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM purchase_order", Long.class)).isZero();
    }
}
