package io.incidentlens.common;

import java.time.Instant;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;

class FaultStateTest {
    @Test void missingOwnerMustNeverTurnIntoAGlobalFault() {
        for (String owner : new String[]{null, "", " "}) {
            var fault = new FaultState(owner, FaultState.Scenario.DOWNSTREAM_LATENCY, true, 100,
                    Instant.now().plusSeconds(60));
            assertThat(fault.active(FaultState.Scenario.DOWNSTREAM_LATENCY, "unrelated-session")).isFalse();
            assertThat(fault.active(FaultState.Scenario.DOWNSTREAM_LATENCY, owner)).isFalse();
        }
    }
    @Test void missingScenarioAndRequestSessionCannotActivateAFault() {
        var expiry = Instant.now().plusSeconds(60);
        var missingScenario = new FaultState("owner", null, true, 100, expiry);
        assertThat(missingScenario.active(null, "owner")).isFalse();
        var valid = new FaultState("owner", FaultState.Scenario.DOWNSTREAM_LATENCY, true, 100, expiry);
        assertThat(valid.active(FaultState.Scenario.DOWNSTREAM_LATENCY, null)).isFalse();
        assertThat(valid.active(FaultState.Scenario.DOWNSTREAM_LATENCY, "")).isFalse();
    }
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
