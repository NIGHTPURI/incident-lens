package io.incidentlens.demoworker;

import io.incidentlens.common.SessionTelemetry;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import java.util.LinkedHashMap;

@RestController
public class TelemetryController {
    private final SessionTelemetry telemetry;
    private final ConsumerLagMonitor lag;
    public TelemetryController(SessionTelemetry telemetry, ConsumerLagMonitor lag) { this.telemetry = telemetry; this.lag = lag; }
    @GetMapping("/internal/telemetry")
    SessionTelemetry.Snapshot snapshot(@RequestParam(defaultValue = "unscoped") String sessionId, @RequestParam(defaultValue = "NONE") String phase) {
        var metrics = new LinkedHashMap<String, Double>(); metrics.put("kafkaLag", lag.current());
        return telemetry.snapshot("demo-worker", sessionId, phase, metrics);
    }
}
