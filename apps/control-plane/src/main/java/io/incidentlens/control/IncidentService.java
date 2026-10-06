package io.incidentlens.control;

import org.springframework.data.domain.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.*;

@Service
class IncidentService {
    private final SessionRepository sessions;
    private final ExperimentRepository experiments;
    private final LabLockRepository locks;
    private final FaultCoordinator faults;
    private final EvidenceCollector evidence;
    private final RcaService rca;
    private final JdbcTemplate jdbc;
    private final TelemetryClient telemetry;
    private final JsonCodec json;
    IncidentService(SessionRepository sessions, ExperimentRepository experiments, LabLockRepository locks,
                    FaultCoordinator faults, EvidenceCollector evidence, RcaService rca, JdbcTemplate jdbc,
                    TelemetryClient telemetry, JsonCodec json) {
        this.sessions = sessions; this.experiments = experiments; this.locks = locks; this.faults = faults;
        this.evidence = evidence; this.rca = rca; this.jdbc = jdbc; this.telemetry = telemetry; this.json = json;
    }
    @Transactional
    public Models.Session create(Models.CreateSession request) { return sessions.save(new SessionEntity(request)).view(); }
    public List<Models.Session> list(int page, int size) {
        return sessions.findAll(PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"))).map(SessionEntity::view).getContent();
    }
    SessionEntity require(String id) { return sessions.findById(id).orElseThrow(ApiFailure::missing); }
    @Transactional(readOnly = true)
    public Models.SessionDetail detail(String id) {
        var session = require(id);
        List<Models.Activation> activations = jdbc.query("SELECT enabled,parameter_value,occurred_at FROM fault_activation WHERE session_id=? ORDER BY occurred_at", (rs, n) ->
            new Models.Activation(rs.getBoolean(1), rs.getInt(2), rs.getTimestamp(3).toInstant()), id);
        var report = rca.get(id);
        var visibleEvidence = evidence.list(id);
        if (report != null) visibleEvidence = evidence.includeCitations(id, visibleEvidence, report.evidenceIds());
        return new Models.SessionDetail(session.view(), activations, visibleEvidence, report, experiments.findBySessionId(id).stream().map(this::view).toList());
    }
    @Transactional
    public Models.FaultState fault(String id, Models.FaultCommand command) {
        var session = require(id);
        var lock = acquireLab();
        if (lock.running()) {
            if (command.enabled()) throw ApiFailure.conflict("Fault settings cannot change during a workload run");
            var running = experiments.findById(lock.experimentId).orElseThrow(ApiFailure::missing);
            if (!running.sessionId.equals(id)) throw ApiFailure.conflict("Another session has an active workload run");
            running.status = "ABORTED";
            lock.clear();
        }
        Models.FaultState state = faults.apply(session, command);
        session.status = command.enabled() ? "FAULT_ACTIVE" : "FAULT_DISABLED"; session.updatedAt = Instant.now();
        jdbc.update("INSERT INTO fault_activation(id,session_id,enabled,parameter_value,occurred_at) VALUES(?,?,?,?,?)",
            UUID.randomUUID().toString(), id, command.enabled(), command.parameter(), Timestamp.from(session.updatedAt));
        org.slf4j.LoggerFactory.getLogger(IncidentService.class).atInfo()
            .addKeyValue("sessionId", id).addKeyValue("scenario", session.scenario)
            .addKeyValue("faultEnabled", command.enabled()).addKeyValue("parameter", command.parameter())
            .log("Incident fault configuration applied");
        return state;
    }
    public List<Models.Evidence> collect(String id, Models.Phase phase) {
        var session = require(id);
        return evidence.collect(id, session.createdAt, phase.name());
    }
    public Models.Report analyze(String id) { require(id); return rca.generate(id); }
    @Transactional
    public Models.Experiment createExperiment(String id, Models.Workload workload) {
        require(id);
        if (!experiments.findBySessionId(id).isEmpty()) throw ApiFailure.conflict("Use a new incident session for another experiment so telemetry windows remain independent");
        return view(experiments.saveAndFlush(new ExperimentEntity(id, workload)));
    }
    public Models.Experiment experiment(String id) { return view(experiments.findById(id).orElseThrow(ApiFailure::missing)); }
    @Transactional
    public Map<String, Object> start(String id, Models.Phase phase) { return start(id, phase, null); }
    @Transactional
    public Map<String, Object> start(String id, Models.Phase phase, Models.ExecutionConfiguration configuration) {
        var lock = acquireLab();
        if (lock.running()) throw ApiFailure.conflict("A workload run already holds the lab; complete it or disable its fault to abort");
        var experiment = experiments.findById(id).orElseThrow(ApiFailure::missing);
        String expected = phase == Models.Phase.BEFORE ? "CREATED" : "BEFORE_COMPLETE";
        if (!expected.equals(experiment.status)) throw ApiFailure.conflict("Run sequence must be CREATED → BEFORE → AFTER; completed runs cannot be overwritten");
        if (phase == Models.Phase.AFTER) {
            Models.ExecutionConfiguration previous = experiment.configurationJson == null ? null : json.read(experiment.configurationJson, Models.ExecutionConfiguration.class);
            if (!Objects.equals(previous, configuration)) throw ApiFailure.conflict("Execution configuration changed between BEFORE and AFTER. Start a fresh experiment.");
        }
        validateFault(experiment, phase);
        for (var snapshot : telemetry.snapshots(experiment.sessionId, phase.name())) {
            if (!snapshot.available()) throw new ApiFailure(org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE,
                "Cannot verify a fresh telemetry phase while a demo service is unavailable");
            if (snapshot.metrics().getOrDefault("requestCount", 0.0) > 0
                || snapshot.metrics().getOrDefault("processedCount", 0.0) > 0
                || snapshot.metrics().getOrDefault("duplicateCount", 0.0) > 0) {
                throw ApiFailure.conflict("This phase already contains workload observations; create a fresh incident session");
            }
        }
        experiment.status = phase.name() + "_RUNNING"; experiment.runStartedAt = Instant.now();
        if (phase == Models.Phase.BEFORE) {
            experiment.configurationJson = configuration == null ? null : json.write(configuration);
            experiment.beforeStartedAt = experiment.runStartedAt;
        } else experiment.afterStartedAt = experiment.runStartedAt;
        lock.experimentId = id; lock.phase = phase.name(); lock.leaseUntil = Instant.now().plusSeconds(experiment.durationSeconds + 180);
        return Map.of("phase", phase, "startedAt", experiment.runStartedAt);
    }
    @Transactional
    public Models.Experiment complete(String id, Models.Phase phase, Models.CompleteRun input) {
        validateMeasurement(input);
        var lock = acquireLab();
        var experiment = experiments.findById(id).orElseThrow(ApiFailure::missing);
        if (!lock.running() || !id.equals(lock.experimentId) || !phase.name().equals(lock.phase)
            || !(phase.name() + "_RUNNING").equals(experiment.status)) throw ApiFailure.conflict("No matching active run; its lease may have expired");
        if (experiment.vus != input.workload().vus() || experiment.durationSeconds != input.workload().durationSeconds()) {
            throw ApiFailure.conflict("Workload configuration differs from the experiment; BEFORE and AFTER must match");
        }
        validateFault(experiment, phase);
        Map<String, Double> metrics = summarize(input);
        List<Models.Evidence> observed = evidence.collect(experiment.sessionId, experiment.runStartedAt, phase.name());
        for (Models.Evidence value : observed) {
            if (value.value() == null) continue;
            switch (value.type()) {
                case "DB_QUERY_P95" -> metrics.put("dbQueryP95Ms", value.value());
                case "KAFKA_LAG" -> metrics.put("kafkaLag", value.value());
                case "CACHE_HIT_RATE" -> metrics.put("cacheHitRate", value.value());
                default -> { }
            }
        }
        if (phase == Models.Phase.BEFORE) { experiment.beforeJson = json.write(metrics); experiment.beforeEndedAt = Instant.now(); experiment.status = "BEFORE_COMPLETE"; }
        else { experiment.afterJson = json.write(metrics); experiment.afterEndedAt = Instant.now(); experiment.status = "COMPLETE"; }
        lock.clear();
        return view(experiment);
    }
    private void validateFault(ExperimentEntity experiment, Models.Phase phase) {
        Models.FaultState current = faults.current();
        if (phase == Models.Phase.BEFORE && (current == null || !current.sessionId().equals(experiment.sessionId))) {
            throw ApiFailure.conflict("BEFORE requires this session's active fault; expired or disabled runs are invalid");
        }
        if (phase == Models.Phase.AFTER && current != null) throw ApiFailure.conflict("Disable all faults before AFTER");
    }
    private LabLock acquireLab() {
        var lock = locks.acquire();
        if (lock.experimentId != null && !lock.running()) {
            experiments.findById(lock.experimentId).ifPresent(expired -> {
                if (expired.status.endsWith("_RUNNING")) expired.status = "ABORTED";
            });
            lock.clear();
        }
        return lock;
    }
    @org.springframework.scheduling.annotation.Scheduled(fixedDelayString = "${incidentlens.lab.reconcile-ms:5000}")
    @Transactional
    public void reconcileExpiredRun() { acquireLab(); }
    static void validateMeasurement(Models.CompleteRun input) {
        if (input.requestCount() <= 0 || input.errorCount() < 0 || input.errorCount() > input.requestCount()
            || !Double.isFinite(input.durationSeconds()) || input.durationSeconds() <= 0
            || !Double.isFinite(input.p50Ms()) || !Double.isFinite(input.p95Ms()) || !Double.isFinite(input.p99Ms())
            || input.p50Ms() < 0 || input.p50Ms() > input.p95Ms() || input.p95Ms() > input.p99Ms()) {
            throw ApiFailure.invalid("Measurements must contain traffic, finite nonnegative ordered percentiles, and errors no greater than requests");
        }
    }
    static Map<String, Double> summarize(Models.CompleteRun input) {
        Map<String, Double> metrics = new LinkedHashMap<>();
        metrics.put("requestCount", (double) input.requestCount()); metrics.put("errorCount", (double) input.errorCount());
        metrics.put("durationSeconds", input.durationSeconds()); metrics.put("throughput", input.requestCount() / input.durationSeconds());
        metrics.put("successRate", 1.0 - (double) input.errorCount() / input.requestCount());
        metrics.put("p50Ms", input.p50Ms()); metrics.put("p95Ms", input.p95Ms()); metrics.put("p99Ms", input.p99Ms());
        return metrics;
    }
    Models.Experiment view(ExperimentEntity entity) {
        return new Models.Experiment(entity.id, entity.sessionId, entity.status, new Models.Workload(entity.vus, entity.durationSeconds),
            json.metrics(entity.beforeJson), json.metrics(entity.afterJson), entity.createdAt,
            new Models.ExecutionRecord(entity.configurationJson == null ? null : json.read(entity.configurationJson, Models.ExecutionConfiguration.class),
                entity.beforeStartedAt == null ? null : new Models.MeasurementWindow(entity.beforeStartedAt, entity.beforeEndedAt),
                entity.afterStartedAt == null ? null : new Models.MeasurementWindow(entity.afterStartedAt, entity.afterEndedAt)));
    }
    public Models.Overview overview() {
        List<TelemetryClient.Snapshot> snapshots = telemetry.snapshots("ALL", "ALL");
        List<Models.ServiceHealth> health = new ArrayList<>();
        health.add(new Models.ServiceHealth("control-plane", "UP"));
        snapshots.forEach(s -> health.add(new Models.ServiceHealth(s.service(), s.available() ? "UP" : "UNAVAILABLE")));
        Map<String, Double> metrics = new LinkedHashMap<>();
        snapshots.forEach(s -> s.metrics().forEach((key, value) -> { if (s.service().equals("demo-api") || key.equals("kafkaLag")) metrics.put(key, value); }));
        Models.FaultState current = null;
        try { current = faults.current(); health.add(new Models.ServiceHealth("redis", "UP")); }
        catch (RuntimeException failure) { health.add(new Models.ServiceHealth("redis", "UNAVAILABLE")); }
        return new Models.Overview(health, metrics, current);
    }
}
