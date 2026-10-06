package io.incidentlens.control;

import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;
import java.util.Map;
import static org.assertj.core.api.Assertions.*;

class RuntimeConfigurationTest {
    @Test void validatesInstanceProfileAndChangedHostPortsWithoutGuessingHardware() {
        var runtime = new RuntimeConfiguration(new MockEnvironment().withProperty("HOSTNAME", "local-instance")
            .withProperty("CONTROL_PLANE_PORT", "18080").withProperty("DEMO_API_PORT", "18081"));
        var config = configuration(runtime, "local-instance", "core", "http://127.0.0.1:18080");
        assertThatCode(() -> runtime.validate(config)).doesNotThrowAnyException();
        assertThat(runtime.view()).doesNotContainKeys("ram", "cpu", "dockerReady");
        assertThatThrownBy(() -> runtime.validate(configuration(runtime, "different-instance", "core", config.controlTarget()))).isInstanceOf(ApiFailure.class);
        assertThatThrownBy(() -> runtime.validate(configuration(runtime, "local-instance", "observability", config.controlTarget()))).isInstanceOf(ApiFailure.class);
        assertThatThrownBy(() -> runtime.validate(configuration(runtime, "local-instance", "core", "http://127.0.0.1:8080"))).isInstanceOf(ApiFailure.class);
        assertThatCode(() -> runtime.validate(null)).doesNotThrowAnyException(); // Legacy metadata remains unknown.
    }
    static Models.ExecutionConfiguration configuration(RuntimeConfiguration runtime, String id, String profile, String origin) {
        return new Models.ExecutionConfiguration("a".repeat(64), id, profile, "unit-test", origin, "http://demo-api:8081", runtime.ports(),
            Map.of("mysql",768L,"redis",128L,"kafka",896L,"web",128L,"control-plane",640L,"demo-api",640L,"demo-worker",640L));
    }
}
