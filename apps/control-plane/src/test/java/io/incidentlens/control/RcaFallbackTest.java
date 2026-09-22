package io.incidentlens.control;

import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import com.fasterxml.jackson.databind.json.JsonMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import java.util.List;
import static org.mockito.Mockito.*;
import static org.assertj.core.api.Assertions.*;

class RcaFallbackTest {
    @Test void invalidProviderFallsBackAndPersistsCitedRuleBasedReport() {
        var llm = mock(OpenAiCompatibleRcaProvider.class);
        var evidence = mock(EvidenceCollector.class);
        var jdbc = mock(JdbcTemplate.class);
        var meters = new SimpleMeterRegistry();
        when(llm.configured()).thenReturn(true);
        when(llm.analyze(anyList())).thenThrow(new IllegalStateException("Invalid provider output"));
        when(evidence.list("session")).thenReturn(List.of(EvidenceAndRcaTest.metric("req", "REQUEST_COUNT", 40.0), EvidenceAndRcaTest.metric("lag", "KAFKA_LAG", 100.0)));
        var service = new RcaService(new RuleBasedRcaProvider(), llm, evidence, jdbc,
                new JsonCodec(JsonMapper.builder().addModule(new JavaTimeModule()).build()), meters);
        var report = service.generate("session");
        assertThat(report.provider()).isEqualTo("rule-based");
        assertThat(report.evidenceIds()).contains("lag");
        assertThat(meters.counter("incidentlens.rca.fallback").count()).isEqualTo(1);
        verify(jdbc).update(anyString(), eq("session"), anyString(), any(java.sql.Timestamp.class));
    }
}
