package io.incidentlens.common;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import java.time.Instant;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class FaultStoreTest {
    private final StringRedisTemplate redis = mock(StringRedisTemplate.class);
    @SuppressWarnings("unchecked")
    private final ValueOperations<String, String> values = mock(ValueOperations.class);
    private final ObjectMapper mapper = new ObjectMapper().findAndRegisterModules();
    private final SimpleMeterRegistry meters = new SimpleMeterRegistry();
    private final FaultStore store = new FaultStore(redis, mapper, meters);

    FaultStoreTest() { when(redis.opsForValue()).thenReturn(values); }

    @Test void jsonNullBecomesInactiveAndRecordsAReadFailure() {
        when(values.get(FaultStore.KEY)).thenReturn("null");
        assertThat(store.current()).isEqualTo(FaultState.inactive());
        assertThat(meters.counter("incidentlens.fault.read.failures").count()).isEqualTo(1);
    }

    @Test void missingKeyIsInactiveWithoutAReadFailure() {
        assertThat(store.current()).isEqualTo(FaultState.inactive());
        assertThat(meters.find("incidentlens.fault.read.failures").counter()).isNull();
    }

    @Test void malformedJsonAndUnavailableRedisDoNotLatchAFault() {
        when(values.get(FaultStore.KEY)).thenReturn("{broken").thenThrow(new IllegalStateException("offline"));
        assertThat(store.current()).isEqualTo(FaultState.inactive());
        assertThat(store.current()).isEqualTo(FaultState.inactive());
        assertThat(meters.counter("incidentlens.fault.read.failures").count()).isEqualTo(2);
    }

    @Test void deserializedFaultRemainsRestrictedToItsOwner() throws Exception {
        var valid = new FaultState("owner", FaultState.Scenario.CACHE_DEGRADATION, true, 0,
                Instant.now().plusSeconds(60));
        when(values.get(FaultStore.KEY)).thenReturn(mapper.writeValueAsString(valid));
        assertThat(store.current().active(FaultState.Scenario.CACHE_DEGRADATION, "owner")).isTrue();
        assertThat(store.current().active(FaultState.Scenario.CACHE_DEGRADATION, "other")).isFalse();
    }
}
