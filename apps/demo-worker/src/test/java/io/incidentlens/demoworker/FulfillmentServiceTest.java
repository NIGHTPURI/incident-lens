package io.incidentlens.demoworker;

import io.incidentlens.common.OrderCreated;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import java.time.Instant;
import java.util.UUID;
import java.util.Map;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class FulfillmentServiceTest {
    private final JdbcTemplate jdbc = mock(JdbcTemplate.class);
    private final FulfillmentService service = new FulfillmentService(jdbc);
    private final OrderCreated event = new OrderCreated(1, UUID.randomUUID().toString(), UUID.randomUUID().toString(), 1, 2, "incident", "BEFORE", "correlation", null, Instant.now());
    @Test void duplicateEventDoesNotApplyBusinessChangeAgain() {
        when(jdbc.queryForMap(startsWith("SELECT payload_fingerprint"), eq(event.eventId())))
                .thenReturn(Map.of("payload_fingerprint", event.orderId() + ":1:2", "delivery_token", "earlier-delivery"));
        assertThat(service.fulfill(event)).isEqualTo(FulfillmentService.Result.DUPLICATE_EVENT);
        verify(jdbc, never()).update(startsWith("INSERT INTO fulfillment"), any(), any(), any(), any());
    }
    @Test void duplicatedEventIdWithDifferentPayloadIsRejected() {
        when(jdbc.queryForMap(startsWith("SELECT payload_fingerprint"), eq(event.eventId())))
                .thenReturn(Map.of("payload_fingerprint", "conflicting", "delivery_token", "earlier-delivery"));
        assertThatThrownBy(() -> service.fulfill(event)).isInstanceOf(IllegalArgumentException.class).hasMessageContaining("conflicting");
    }
    @Test void unsupportedSchemaNeverReachesDatabase() {
        var invalid = new OrderCreated(2, event.eventId(), event.orderId(), 1, 2, null, null, null, null, Instant.now());
        assertThatThrownBy(() -> service.fulfill(invalid)).isInstanceOf(IllegalArgumentException.class);
        verifyNoInteractions(jdbc);
    }
}
