package io.incidentlens.demoworker;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.incidentlens.common.OrderCreated;
import io.incidentlens.common.SessionTelemetry;
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
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.kafka.KafkaContainer;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import static org.assertj.core.api.Assertions.*;
import static org.awaitility.Awaitility.await;
import static org.mockito.Mockito.doThrow;

@Tag("integration")
@Testcontainers
@SpringBootTest
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class WorkerIntegrationTest {
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
    @MockitoSpyBean FulfillmentService fulfillment;
    @Autowired JdbcTemplate jdbc;
    @Autowired TransactionTemplate transactions;
    @Autowired KafkaTemplate<String, String> kafka;
    @Autowired ObjectMapper mapper;
    @Autowired SessionTelemetry telemetry;
    @BeforeEach void clean() { jdbc.update("DELETE FROM fulfillment"); jdbc.update("DELETE FROM processed_event"); }
    @Test void concurrentDuplicateDeliveryProducesOneFulfillment() throws Exception {
        var event = event(); var start = new CountDownLatch(1);
        try (var executor = Executors.newFixedThreadPool(12)) {
            var tasks = new ArrayList<java.util.concurrent.Future<FulfillmentService.Result>>();
            for (int n = 0; n < 12; n++) tasks.add(executor.submit(() -> { start.await(); return fulfillment.fulfill(event); }));
            start.countDown();
            int applied = 0;
            for (var task : tasks) if (task.get(15, TimeUnit.SECONDS) == FulfillmentService.Result.PROCESSED) applied++;
            assertThat(applied).isEqualTo(1);
        }
        assertThat(count("fulfillment")).isEqualTo(1); assertThat(count("processed_event")).isEqualTo(1);
    }
    @Test void businessFailureRollsBackTheDeduplicationMarker() {
        var event = event();
        assertThatThrownBy(() -> transactions.execute(status -> { fulfillment.fulfill(event); throw new IllegalStateException("crash before commit"); }))
                .isInstanceOf(IllegalStateException.class);
        assertThat(count("processed_event")).isZero(); assertThat(count("fulfillment")).isZero();
        assertThat(fulfillment.fulfill(event)).isEqualTo(FulfillmentService.Result.PROCESSED);
    }
    @Test void duplicateOrderWithDifferentEventIdDoesNotDuplicateBusinessState() {
        var first = event(); var second = new OrderCreated(1, UUID.randomUUID().toString(), first.orderId(), first.productId(), first.quantity(),
                first.sessionId(), first.phase(), first.correlationId(), null, Instant.now());
        assertThat(fulfillment.fulfill(first)).isEqualTo(FulfillmentService.Result.PROCESSED);
        assertThat(fulfillment.fulfill(second)).isEqualTo(FulfillmentService.Result.DUPLICATE_ORDER);
        assertThat(count("fulfillment")).isEqualTo(1); assertThat(count("processed_event")).isEqualTo(2);
    }
    @Test void realKafkaRedeliveryIsIdempotent() throws Exception {
        var event = event(); String payload = mapper.writeValueAsString(event);
        kafka.send(OrderCreated.TOPIC, event.orderId(), payload).get(10, TimeUnit.SECONDS);
        kafka.send(OrderCreated.TOPIC, event.orderId(), payload).get(10, TimeUnit.SECONDS);
        await().atMost(Duration.ofSeconds(20)).untilAsserted(() -> assertThat(count("fulfillment")).isEqualTo(1));
        await().atMost(Duration.ofSeconds(10)).untilAsserted(() -> assertThat(telemetry.snapshot("demo-worker", event.sessionId(), "BEFORE", Map.of()).metrics())
                .containsEntry("duplicateCount", 1.0).containsEntry("processedCount", 1.0));
        assertThat(count("fulfillment")).isEqualTo(1);
    }
    @Test void transientProcessingFailureIsRetriedThroughKafkaAndRecovers() throws Exception {
        var event = event();
        doThrow(new org.springframework.dao.TransientDataAccessResourceException("simulated transient outage"))
                .doCallRealMethod().when(fulfillment).fulfill(event);
        kafka.send(OrderCreated.TOPIC, event.orderId(), mapper.writeValueAsString(event)).get(10, TimeUnit.SECONDS);
        await().atMost(Duration.ofSeconds(20)).untilAsserted(() -> {
            assertThat(count("fulfillment")).isEqualTo(1);
            assertThat(telemetry.snapshot("demo-worker", event.sessionId(), "BEFORE", Map.of()).events())
                    .extracting(SessionTelemetry.Event::type).contains("CONSUMER_FAILURE", "ORDER_FULFILLED");
        });
    }
    @Test void invalidSchemaIsPublishedToDlqWithOriginalPayload() throws Exception {
        String marker = UUID.randomUUID().toString();
        String invalid = "{\"schemaVersion\":999,\"eventId\":\"" + marker + "\"}";
        kafka.send(OrderCreated.TOPIC, marker, invalid).get(10, TimeUnit.SECONDS);
        try (var consumer = new KafkaConsumer<String, String>(Map.of(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, KAFKA.getBootstrapServers(),
                ConsumerConfig.GROUP_ID_CONFIG, "dlq-test-" + marker, ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "earliest",
                ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class, ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class))) {
            consumer.subscribe(java.util.List.of(OrderCreated.DLQ));
            boolean found = false; long deadline = System.nanoTime() + Duration.ofSeconds(20).toNanos();
            while (!found && System.nanoTime() < deadline) for (var record : consumer.poll(Duration.ofMillis(200))) {
                if (invalid.equals(record.value())) { found = true; assertThat(record.headers().lastHeader("kafka_dlt-exception-fqcn")).isNotNull(); }
            }
            assertThat(found).isTrue();
        }
    }
    private OrderCreated event() { return new OrderCreated(1, UUID.randomUUID().toString(), UUID.randomUUID().toString(), 1, 2, UUID.randomUUID().toString(), "BEFORE", "integration", null, Instant.now()); }
    private long count(String table) { return jdbc.queryForObject("SELECT COUNT(*) FROM " + table, Long.class); }
}
