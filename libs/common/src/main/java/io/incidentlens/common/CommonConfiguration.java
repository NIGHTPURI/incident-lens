package io.incidentlens.common;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.data.redis.core.StringRedisTemplate;

@Configuration
@Import(ApiExceptionHandler.class)
public class CommonConfiguration {
    @Bean FaultStore faultStore(StringRedisTemplate redis, ObjectMapper mapper, MeterRegistry meters) { return new FaultStore(redis, mapper, meters); }
    @Bean SessionTelemetry sessionTelemetry(MeterRegistry meters) { return new SessionTelemetry(meters); }
    @Bean CorrelationFilter correlationFilter(SessionTelemetry telemetry) { return new CorrelationFilter(telemetry); }
    @Bean JsonBodyLimitFilter jsonBodyLimitFilter() { return new JsonBodyLimitFilter(); }
}
