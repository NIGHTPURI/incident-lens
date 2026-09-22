package io.incidentlens.demoapi;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.incidentlens.common.OrderCreated;
import io.incidentlens.common.RequestContext;
import io.incidentlens.common.SessionTelemetry;
import io.incidentlens.common.TraceContext;
import io.micrometer.core.instrument.MeterRegistry;
import org.apache.kafka.clients.producer.ProducerRecord;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.TimeUnit;

@Component
public class OutboxRelay {
    private static final Logger LOG = LoggerFactory.getLogger(OutboxRelay.class);
    private final OutboxStore store;
    private final KafkaTemplate<String, String> kafka;
    private final ObjectMapper mapper;
    private final MeterRegistry meters;
    private final SessionTelemetry telemetry;
    private final boolean enabled;
    public OutboxRelay(OutboxStore store, KafkaTemplate<String, String> kafka, ObjectMapper mapper, MeterRegistry meters,
                       SessionTelemetry telemetry, @Value("${incidentlens.outbox.enabled:true}") boolean enabled) {
        this.store = store; this.kafka = kafka; this.mapper = mapper; this.meters = meters; this.telemetry = telemetry; this.enabled = enabled;
        meters.gauge("incidentlens.outbox.pending", store, OutboxStore::pending);
    }
    @Scheduled(fixedDelayString = "${incidentlens.outbox.interval-ms:200}")
    public void scheduledPublish() { if (enabled) publishBatch(); }
    public int publishBatch() {
        int published = 0;
        for (int n = 0; n < 10; n++) {
            var claimed = store.claim(); if (claimed.isEmpty()) break;
            var claim = claimed.get();
            try {
                var event = mapper.readValue(claim.payload(), OrderCreated.class);
                var context = RequestContext.from(event.sessionId(), event.phase(), event.correlationId());
                try (var ignored = RequestContext.install(context); var trace = TraceContext.restore(event.traceparent());
                     var correlation = MDC.putCloseable("correlationId", context.correlationId());
                     var incident = MDC.putCloseable("incidentId", context.sessionId())) {
                    var record = new ProducerRecord<String, String>(OrderCreated.TOPIC, claim.aggregateId(), claim.payload());
                    record.headers().add("X-Incident-Id", context.sessionId().getBytes(StandardCharsets.UTF_8));
                    record.headers().add("X-Correlation-Id", context.correlationId().getBytes(StandardCharsets.UTF_8));
                    kafka.send(record).get(5, TimeUnit.SECONDS);
                    if (store.published(claim)) {
                        published++; meters.counter("incidentlens.outbox.published").increment();
                        telemetry.event("OUTBOX_PUBLISHED", "Kafka acknowledged eventId=" + event.eventId() + " after attempt=" + claim.attempt());
                        LOG.info("order_event_published eventId={} orderId={} attempt={}", event.eventId(), event.orderId(), claim.attempt());
                    }
                }
            } catch (Exception ex) {
                store.failed(claim, ex.getClass().getSimpleName());
                meters.counter("incidentlens.outbox.failures").increment();
                LOG.warn("outbox_publish_failed eventId={} attempt={} errorType={}", claim.id(), claim.attempt(), ex.getClass().getSimpleName());
                if (ex instanceof InterruptedException) { Thread.currentThread().interrupt(); break; }
            }
        }
        return published;
    }
}
