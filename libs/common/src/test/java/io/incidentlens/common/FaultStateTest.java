package io.incidentlens.common;

import java.time.Instant;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;

class FaultStateTest {
    @Test void faultIsScopedExpiresAndBoundsDelay() {
        var active = new FaultState("incident", FaultState.Scenario.DOWNSTREAM_LATENCY, true, 50_000, Instant.now().plusSeconds(30));
        assertThat(active.active(FaultState.Scenario.DOWNSTREAM_LATENCY, "incident")).isTrue();
        assertThat(active.active(FaultState.Scenario.DOWNSTREAM_LATENCY, "other")).isFalse();
        assertThat(active.active(FaultState.Scenario.KAFKA_SLOWDOWN, "incident")).isFalse();
        assertThat(active.boundedDelayMillis()).isEqualTo(3000);
        var expired = new FaultState("incident", FaultState.Scenario.DOWNSTREAM_LATENCY, true, 200, Instant.now().minusSeconds(1));
        assertThat(expired.active(FaultState.Scenario.DOWNSTREAM_LATENCY, "incident")).isFalse();
    }
}
