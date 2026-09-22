package io.incidentlens.control;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.http.HttpStatus;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/api")
@Validated
class IncidentController {
    private final IncidentService incidents;
    IncidentController(IncidentService incidents) { this.incidents = incidents; }
    @GetMapping("/overview") Models.Overview overview() { return incidents.overview(); }
    @GetMapping("/sessions") List<Models.Session> list(@RequestParam(defaultValue = "0") @Min(0) int page,
                @RequestParam(defaultValue = "50") @Min(1) @Max(100) int size) { return incidents.list(page, size); }
    @PostMapping("/sessions") @ResponseStatus(HttpStatus.CREATED)
    Models.Session create(@Valid @RequestBody Models.CreateSession request) { return incidents.create(request); }
    @GetMapping("/sessions/{id}") Models.SessionDetail detail(@PathVariable String id) { return incidents.detail(id); }
    @PutMapping("/sessions/{id}/fault") Models.FaultState fault(@PathVariable String id, @Valid @RequestBody Models.FaultCommand request) { return incidents.fault(id, request); }
    @PostMapping("/sessions/{id}/evidence") List<Models.Evidence> evidence(@PathVariable String id,
            @RequestParam(defaultValue = "BEFORE") Models.Phase phase) { return incidents.collect(id, phase); }
    @PostMapping("/sessions/{id}/rca") Models.Report rca(@PathVariable String id) { return incidents.analyze(id); }
    @PostMapping("/sessions/{id}/experiments") @ResponseStatus(HttpStatus.CREATED)
    Models.Experiment createExperiment(@PathVariable String id, @Valid @RequestBody Models.Workload workload) { return incidents.createExperiment(id, workload); }
    @GetMapping("/experiments/{id}") Models.Experiment experiment(@PathVariable String id) { return incidents.experiment(id); }
    @PostMapping("/experiments/{id}/runs") Map<String, Object> start(@PathVariable String id, @Valid @RequestBody Models.StartRun run) { return incidents.start(id, run.phase()); }
    @PostMapping("/experiments/{id}/runs/{phase}/complete") Models.Experiment complete(@PathVariable String id, @PathVariable Models.Phase phase,
            @Valid @RequestBody Models.CompleteRun input) { return incidents.complete(id, phase, input); }
}
