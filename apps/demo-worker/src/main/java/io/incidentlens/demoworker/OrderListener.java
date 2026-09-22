package io.incidentlens.demoworker;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.incidentlens.common.FaultState;
import io.incidentlens.common.FaultStore;
import io.incidentlens.common.OrderCreated;
import io.incidentlens.common.RequestContext;
import io.incidentlens.common.SessionTelemetry;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Component
public class OrderListener {
    private static final Logger LOG = LoggerFactory.getLogger(OrderListener.class);
    private final ObjectMapper mapper;
    private final FulfillmentService fulfillment;
    private final FaultStore faults;
    private final SessionTelemetry telemetry;
    public OrderListener(ObjectMapper mapper, FulfillmentService fulfillment, FaultStore faults, SessionTelemetry telemetry) {
        this.mapper = mapper; this.fulfillment = fulfillment; this.faults = faults; this.telemetry = telemetry;
    }
    @KafkaListener(topics = OrderCreated.TOPIC, groupId = "incidentlens-fulfillment-v1", concurrency = "${incidentlens.worker.concurrency:3}")
    public void receive(ConsumerRecord<String, String> record) throws Exception {
        OrderCreated event;
        try { event = mapper.readValue(record.value(), OrderCreated.class); event.validate(); }
        catch (Exception ex) { throw new IllegalArgumentException("Unsupported or invalid order event", ex); }
        var context = RequestContext.from(event.sessionId(), event.phase(), event.correlationId());
        try (var ignored = RequestContext.install(context);
             var correlation = MDC.putCloseable("correlationId", context.correlationId());
             var incident = MDC.putCloseable("incidentId", context.sessionId());
             var phase = MDC.putCloseable("experimentPhase", context.phase())) {
            var fault = faults.current();
            if (fault.active(FaultState.Scenario.KAFKA_SLOWDOWN, context.sessionId())) {
                telemetry.event("CONSUMER_DELAY", "Consumer processing delayed by " + fault.boundedDelayMillis() + "ms before its database transaction");
                try { Thread.sleep(fault.boundedDelayMillis()); }
                catch (InterruptedException ex) { Thread.currentThread().interrupt(); throw new IllegalStateException("Worker interrupted", ex); }
            }
            var result = fulfillment.fulfill(event);
            telemetry.processed(result != FulfillmentService.Result.PROCESSED);
            telemetry.event("ORDER_FULFILLED", "Committed fulfillment outcome=" + result + " eventId=" + event.eventId());
            LOG.info("order_fulfilled eventId={} orderId={} result={} partition={} offset={}", event.eventId(), event.orderId(), result, record.partition(), record.offset());
        }
    }
}
