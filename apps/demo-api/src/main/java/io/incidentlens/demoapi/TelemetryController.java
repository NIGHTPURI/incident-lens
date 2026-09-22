package io.incidentlens.demoapi;

import io.incidentlens.common.SessionTelemetry;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import java.util.Map;

@RestController
public class TelemetryController {
    private final SessionTelemetry telemetry;
    private final OutboxStore outbox;
    public TelemetryController(SessionTelemetry telemetry, OutboxStore outbox) { this.telemetry = telemetry; this.outbox = outbox; }
    @GetMapping("/internal/telemetry")
    SessionTelemetry.Snapshot snapshot(@RequestParam(defaultValue = "unscoped") String sessionId, @RequestParam(defaultValue = "NONE") String phase) {
        return telemetry.snapshot("demo-api", sessionId, phase, Map.of("outboxPending", (double) outbox.pending()));
    }
}
