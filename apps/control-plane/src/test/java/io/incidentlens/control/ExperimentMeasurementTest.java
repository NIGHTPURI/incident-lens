package io.incidentlens.control;

import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;

class ExperimentMeasurementTest {
    @Test void derivesThroughputAndSuccessFromCountsInsteadOfTrustingPercentages() {
        var input = run(100, 4, 20, 10, 20, 30);
        IncidentService.validateMeasurement(input);
        var summary = IncidentService.summarize(input);
        assertThat(summary.get("throughput")).isEqualTo(5.0);
        assertThat(summary.get("successRate")).isEqualTo(.96);
    }
    @Test void impossibleSummariesAreRejected() {
        for (var input : new Models.CompleteRun[]{run(0, 0, 20, 0, 0, 0), run(3, 4, 20, 1, 2, 3),
                run(10, 0, 0, 1, 2, 3), run(10, 0, 20, 30, 20, 10), run(10, 0, 20, 1, 2, Double.NaN)}) {
            assertThatThrownBy(() -> IncidentService.validateMeasurement(input)).isInstanceOf(ApiFailure.class);
        }
    }
    static Models.CompleteRun run(long requests, long errors, double seconds, double p50, double p95, double p99) {
        return new Models.CompleteRun(requests, errors, seconds, p50, p95, p99, new Models.Workload(2, 20));
    }
}
