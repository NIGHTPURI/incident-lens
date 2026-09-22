package io.incidentlens.common;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.data.redis.core.StringRedisTemplate;

/** Fail-open applies to fault injection only: a Redis outage must not leave a fault latched on. */
public class FaultStore {
    public static final String KEY = "incidentlens:fault";
    private final StringRedisTemplate redis;
    private final ObjectMapper mapper;
    private final MeterRegistry meters;
    public FaultStore(StringRedisTemplate redis, ObjectMapper mapper, MeterRegistry meters) {
        this.redis = redis; this.mapper = mapper; this.meters = meters;
    }
    public FaultState current() {
        try {
            String json = redis.opsForValue().get(KEY);
            return json == null ? FaultState.inactive() : mapper.readValue(json, FaultState.class);
        } catch (Exception ex) {
            meters.counter("incidentlens.fault.read.failures").increment();
            return FaultState.inactive();
        }
    }
}
