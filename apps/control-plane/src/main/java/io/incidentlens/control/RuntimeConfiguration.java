package io.incidentlens.control;

import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;
import java.util.Map;

/** Reports declared application configuration, never guesses host hardware. */
@Component
class RuntimeConfiguration {
    private final Environment environment;
    RuntimeConfiguration(Environment environment) { this.environment = environment; }
    Map<String, Integer> ports() {
        return Map.of("controlPlane", port("CONTROL_PLANE_PORT", 8080), "demoApi", port("DEMO_API_PORT", 8081),
            "demoWorker", port("DEMO_WORKER_PORT", 8082), "web", port("WEB_PORT", 3000),
            "prometheus", port("PROMETHEUS_PORT", 9090), "grafana", port("GRAFANA_PORT", 3001));
    }
    private int port(String name, int fallback) { return environment.getProperty(name, Integer.class, fallback); }
    String instanceId() { return environment.getProperty("HOSTNAME", "unavailable"); }
    String profile() { return environment.getProperty("OTEL_SDK_DISABLED", Boolean.class, true) ? "core" : "observability"; }
    Map<String, Object> view() {
        return Map.of("instanceId", instanceId(), "profile", profile(), "hostPorts", ports(),
            "portSource", "declared application environment; verify Docker bindings in the terminal",
            "workloadTarget", "http://demo-api:8081");
    }
    void validate(Models.ExecutionConfiguration input) {
        if (input == null) return; // Old clients retain explicitly unknown configuration.
        String origin = "http://127.0.0.1:" + ports().get("controlPlane");
        if (!instanceId().equals(input.labInstanceId()) || !profile().equals(input.profile())
            || !origin.equals(input.controlTarget()) || !ports().equals(input.hostPorts())) {
            throw ApiFailure.conflict("Runner configuration does not match this local control-plane instance. No run was started.");
        }
    }
}
