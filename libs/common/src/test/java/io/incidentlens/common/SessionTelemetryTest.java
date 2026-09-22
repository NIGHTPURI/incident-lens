package io.incidentlens.common;

import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.Test;
import java.util.Map;
import static org.assertj.core.api.Assertions.assertThat;

class SessionTelemetryTest {
    @Test void phaseHistogramsAreIndependentAndEmptyMeasurementsAreUnknown() throws Exception {
        var telemetry = new SessionTelemetry(new SimpleMeterRegistry());
        try (var ignored = RequestContext.install(RequestContext.from("session-1", "BEFORE", "test"))) {
            for (int value = 1; value <= 100; value++) telemetry.request(value * 1_000_000L, value == 100);
            telemetry.cache(false); telemetry.cache(true);
        }
        var before = telemetry.snapshot("test", "session-1", "BEFORE", Map.of()).metrics();
        assertThat(before).containsEntry("requestCount", 100.0).containsEntry("p95Ms", 95.0)
                .containsEntry("p99Ms", 99.0).containsEntry("errorCount", 1.0).containsEntry("cacheHitRate", .5);
        var after = telemetry.snapshot("test", "session-1", "AFTER", Map.of()).metrics();
        assertThat(after.get("p95Ms")).isNull(); assertThat(after.get("requestCount")).isZero();
    }
    @Test void samplesRemainBoundedAndReflectLatestObservations() {
        var samples = new SessionTelemetry.Samples();
        for (int n = 0; n < 20_000; n++) samples.add(n);
        assertThat(samples.size).isEqualTo(8192);
        assertThat(samples.percentile(.99)).isBetween(19_900.0, 20_000.0);
    }
    @Test void contextRejectsUntrustedIdentifiersAndRestoresPreviousContext() throws Exception {
        var ctx = RequestContext.from("bad\nheader", "injected", "\rmalicious");
        assertThat(ctx.sessionId()).isEqualTo("unscoped"); assertThat(ctx.phase()).isEqualTo("NONE");
        try (var first = RequestContext.install(RequestContext.from("one", "BEFORE", "a"))) {
            try (var second = RequestContext.install(RequestContext.from("two", "AFTER", "b"))) {
                assertThat(RequestContext.current().sessionId()).isEqualTo("two");
            }
            assertThat(RequestContext.current().sessionId()).isEqualTo("one");
        }
    }
}
