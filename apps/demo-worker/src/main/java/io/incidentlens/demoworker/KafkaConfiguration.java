package io.incidentlens.demoworker;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.incidentlens.common.OrderCreated;
import io.incidentlens.common.RequestContext;
import io.incidentlens.common.SessionTelemetry;
import org.apache.kafka.clients.admin.NewTopic;
import org.apache.kafka.common.TopicPartition;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.TopicBuilder;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.listener.DeadLetterPublishingRecoverer;
import org.springframework.kafka.listener.DefaultErrorHandler;
import org.springframework.kafka.support.ExponentialBackOffWithMaxRetries;

@Configuration
public class KafkaConfiguration {
    @Bean NewTopic ordersTopic() { return TopicBuilder.name(OrderCreated.TOPIC).partitions(3).replicas(1).build(); }
    @Bean NewTopic ordersDlqTopic() { return TopicBuilder.name(OrderCreated.DLQ).partitions(3).replicas(1).build(); }
    @Bean DefaultErrorHandler kafkaErrorHandler(KafkaTemplate<String, String> template, SessionTelemetry telemetry, ObjectMapper mapper) {
        var recoverer = new DeadLetterPublishingRecoverer(template, (record, error) -> new TopicPartition(OrderCreated.DLQ, record.partition()));
        // A failed DLQ publication must not commit the source offset and silently discard the event.
        recoverer.setFailIfSendResultIsError(true);
        var backoff = new ExponentialBackOffWithMaxRetries(3);
        backoff.setInitialInterval(200); backoff.setMultiplier(2); backoff.setMaxInterval(1000);
        var handler = new DefaultErrorHandler(recoverer, backoff);
        handler.addNotRetryableExceptions(IllegalArgumentException.class);
        handler.setRetryListeners((record, error, attempt) -> {
            try {
                var event = mapper.readValue(String.valueOf(record.value()), OrderCreated.class);
                try (var ignored = RequestContext.install(RequestContext.from(event.sessionId(), event.phase(), event.correlationId()))) {
                    boolean invalid = false;
                    for (Throwable cause = error; cause != null; cause = cause.getCause()) if (cause instanceof IllegalArgumentException) invalid = true;
                    // Count scheduled retries, including a retry which subsequently succeeds.
                    if (!invalid && attempt <= 3) telemetry.retry();
                    telemetry.event(attempt > 1 ? "CONSUMER_RETRY" : "CONSUMER_FAILURE", "Event attempt=" + attempt + " errorType=" + error.getClass().getSimpleName());
                }
            } catch (Exception ignored) { /* Malformed records have no trustworthy incident metadata. */ }
        });
        return handler;
    }
}
