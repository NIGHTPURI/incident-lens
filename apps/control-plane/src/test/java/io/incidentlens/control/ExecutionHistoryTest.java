package io.incidentlens.control;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;
import java.time.Instant;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class ExecutionHistoryTest {
    private final JsonCodec json = new JsonCodec(new ObjectMapper().findAndRegisterModules());
    private final ExperimentRepository experiments = mock(ExperimentRepository.class);
    private final LabLockRepository locks = mock(LabLockRepository.class);
    private final IncidentService service = new IncidentService(mock(SessionRepository.class), experiments, locks,
        mock(FaultCoordinator.class), mock(EvidenceCollector.class), mock(RcaService.class), mock(org.springframework.jdbc.core.JdbcTemplate.class), mock(TelemetryClient.class), json);
    @Test void restoresMetadataAndRunWindowsWhileLeavingHistoricalFieldsUnknown() {
        var entity = new ExperimentEntity("session", new Models.Workload(2,10));
        assertThat(service.view(entity).execution().configuration()).isNull();
        assertThat(service.view(entity).execution().before()).isNull();
        var runtime = new RuntimeConfiguration(new MockEnvironment().withProperty("HOSTNAME","local"));
        var config = RuntimeConfigurationTest.configuration(runtime,"local","core","http://127.0.0.1:8080");
        entity.configurationJson = json.write(config);
        entity.beforeStartedAt = Instant.parse("2026-10-06T01:00:00Z"); entity.beforeEndedAt = entity.beforeStartedAt.plusSeconds(13);
        entity.beforeJson = "{\"durationSeconds\":10.7,\"requestCount\":20.0}";
        var restored = json.read(json.write(service.view(entity)),Models.Experiment.class);
        assertThat(restored.execution().configuration()).isEqualTo(config);
        assertThat(restored.execution().before().endedAt()).isEqualTo(entity.beforeEndedAt);
        assertThat(restored.before().get("durationSeconds")).isEqualTo(10.7);
        assertThat(restored.execution().after()).isNull();
    }
    @Test void refusesAnAfterRunWithDifferentConfigurationBeforeAnyFaultOrTelemetryCalls() {
        var entity = new ExperimentEntity("session",new Models.Workload(2,10)); entity.status="BEFORE_COMPLETE";
        var runtime = new RuntimeConfiguration(new MockEnvironment().withProperty("HOSTNAME","local"));
        entity.configurationJson=json.write(RuntimeConfigurationTest.configuration(runtime,"local","core","http://127.0.0.1:8080"));
        when(locks.acquire()).thenReturn(new LabLock());when(experiments.findById(entity.id)).thenReturn(java.util.Optional.of(entity));
        assertThatThrownBy(()->service.start(entity.id,Models.Phase.AFTER,null)).isInstanceOf(ApiFailure.class).hasMessageContaining("configuration changed");
    }
}
