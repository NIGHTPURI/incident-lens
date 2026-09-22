package io.incidentlens.demoapi;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.incidentlens.common.OrderCreated;
import io.incidentlens.common.SessionTelemetry;
import io.micrometer.core.instrument.MeterRegistry;
import org.apache.kafka.clients.consumer.ConsumerConfig;
import org.apache.kafka.clients.consumer.KafkaConsumer;
import org.apache.kafka.common.serialization.StringDeserializer;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.kafka.KafkaContainer;
import java.time.Duration;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@Tag("integration")
@Testcontainers
@SpringBootTest(properties = "incidentlens.outbox.enabled=false")
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class OrderOutboxIntegrationTest {
    @Container static final MySQLContainer<?> MYSQL = new MySQLContainer<>("mysql:8.4.6")
            .withTmpFs(Map.of("/var/lib/mysql", "rw,size=512m"))
            .withStartupTimeoutSeconds(240).withConnectTimeoutSeconds(90);
    @Container static final KafkaContainer KAFKA = new KafkaContainer("apache/kafka:3.9.1")
            .withEnv("KAFKA_HEAP_OPTS", "-Xms256m -Xmx512m").withStartupTimeout(Duration.ofSeconds(180));
    @Container static final GenericContainer<?> REDIS = new GenericContainer<>("redis:7.4.5-alpine").withExposedPorts(6379);
    @DynamicPropertySource static void properties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", MYSQL::getJdbcUrl); registry.add("spring.datasource.username", MYSQL::getUsername);
        registry.add("spring.datasource.password", MYSQL::getPassword); registry.add("spring.kafka.bootstrap-servers", KAFKA::getBootstrapServers);
        registry.add("spring.data.redis.host", REDIS::getHost); registry.add("spring.data.redis.port", () -> REDIS.getMappedPort(6379));
    }
    @Autowired OrderService orders;
    @Autowired JdbcTemplate jdbc;
    @Autowired TransactionTemplate transactions;
    @Autowired OutboxStore store;
    @Autowired OutboxRelay relay;
    @Autowired ObjectMapper mapper;
    @Autowired MeterRegistry meters;
    @Autowired SessionTelemetry telemetry;
    @Autowired KafkaTemplate<String, String> kafka;
    @BeforeEach void clean() { jdbc.update("DELETE FROM outbox_event"); jdbc.update("DELETE FROM purchase_order"); }
    @Test void concurrentIdenticalRequestsCommitOneOrderAndOneOutboxEvent() throws Exception {
        var start = new CountDownLatch(1); var ids = new HashSet<String>();
        try (var executor = Executors.newFixedThreadPool(12)) {
            var tasks = new ArrayList<java.util.concurrent.Future<OrderService.Result>>();
            for (int n = 0; n < 12; n++) tasks.add(executor.submit(() -> { start.await(); return orders.create("same-key", 1, 2); }));
            start.countDown();
            for (var task : tasks) ids.add(task.get(15, TimeUnit.SECONDS).order().id());
        }
        assertThat(ids).hasSize(1); assertThat(count("purchase_order")).isEqualTo(1); assertThat(count("outbox_event")).isEqualTo(1);
        assertThatThrownBy(() -> orders.create("same-key", 1, 3)).isInstanceOf(org.springframework.web.server.ResponseStatusException.class);
        assertThat(count("outbox_event")).isEqualTo(1);
    }
    @Test void businessRollbackAlsoRollsBackTheOutbox() {
        assertThatThrownBy(() -> transactions.execute(status -> { orders.create("rollback", 1, 1); throw new IllegalStateException("simulated crash before commit"); }))
                .isInstanceOf(IllegalStateException.class);
        assertThat(count("purchase_order")).isZero(); assertThat(count("outbox_event")).isZero();
    }
    @Test void failedPublicationIsRetriedAndAcknowledgedByRealKafka() throws Exception {
        var order = orders.create("retry", 1, 1);
        @SuppressWarnings("unchecked") KafkaTemplate<String, String> unavailable = mock(KafkaTemplate.class);
        when(unavailable.send(org.mockito.ArgumentMatchers.<org.apache.kafka.clients.producer.ProducerRecord<String, String>>any()))
                .thenReturn(CompletableFuture.failedFuture(new IllegalStateException("broker unavailable")));
        var failedRelay = new OutboxRelay(store, unavailable, mapper, meters, telemetry, false);
        assertThat(failedRelay.publishBatch()).isZero(); assertThat(store.pending()).isEqualTo(1);
        jdbc.update("UPDATE outbox_event SET next_attempt_at=CURRENT_TIMESTAMP(6)");
        assertThat(relay.publishBatch()).isEqualTo(1); assertThat(store.pending()).isZero();
        try (var consumer = consumer()) {
            consumer.subscribe(java.util.List.of(OrderCreated.TOPIC));
            OrderCreated received = null; long deadline = System.nanoTime() + Duration.ofSeconds(15).toNanos();
            while (received == null && System.nanoTime() < deadline) for (var record : consumer.poll(Duration.ofMillis(200))) {
                var event = mapper.readValue(record.value(), OrderCreated.class);
                if (event.orderId().equals(order.order().id())) received = event;
            }
            assertThat(received).isNotNull(); assertThat(received.orderId()).isEqualTo(order.order().id());
        }
    }
    @Test void crashedClaimCanBeReclaimedAndStaleOwnerCannotAcknowledgeIt() {
        orders.create("lease", 1, 1); var old = store.claim().orElseThrow();
        assertThat(store.claim()).isEmpty();
        jdbc.update("UPDATE outbox_event SET leased_until=DATE_SUB(CURRENT_TIMESTAMP(6),INTERVAL 1 SECOND)");
        var replacement = store.claim().orElseThrow();
        assertThat(replacement.id()).isEqualTo(old.id()); assertThat(replacement.token()).isNotEqualTo(old.token());
        assertThat(store.published(old)).isFalse(); assertThat(store.pending()).isEqualTo(1);
        assertThat(store.published(replacement)).isTrue();
    }
    private long count(String table) { return jdbc.queryForObject("SELECT COUNT(*) FROM " + table, Long.class); }
    private KafkaConsumer<String, String> consumer() {
        return new KafkaConsumer<>(Map.of(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, KAFKA.getBootstrapServers(),
                ConsumerConfig.GROUP_ID_CONFIG, "outbox-test-" + UUID.randomUUID(), ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "earliest",
                ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class, ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class));
    }
}
