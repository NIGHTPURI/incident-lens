package io.incidentlens.control;

import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import java.sql.Timestamp;
import java.util.*;

@Service
class RcaService {
    private final RuleBasedRcaProvider rules;
    private final OpenAiCompatibleRcaProvider llm;
    private final EvidenceCollector evidence;
    private final JdbcTemplate jdbc;
    private final JsonCodec json;
    private final MeterRegistry meters;
    RcaService(RuleBasedRcaProvider rules, OpenAiCompatibleRcaProvider llm, EvidenceCollector evidence,
               JdbcTemplate jdbc, JsonCodec json, MeterRegistry meters) {
        this.rules = rules; this.llm = llm; this.evidence = evidence; this.jdbc = jdbc; this.json = json; this.meters = meters;
    }
    Models.Report generate(String sessionId) {
        // Use the newest value for each service/type in BEFORE; AFTER does not rewrite the incident hypothesis.
        Map<String, Models.Evidence> latest = new LinkedHashMap<>();
        evidence.list(sessionId).stream().filter(e -> !"AFTER".equals(e.phase())).forEach(e -> latest.putIfAbsent(e.service() + ":" + e.type(), e));
        List<Models.Evidence> packageEvidence = List.copyOf(latest.values());
        Models.Report report;
        if (llm.configured()) {
            try { report = llm.analyze(packageEvidence); }
            catch (RuntimeException invalid) { meters.counter("incidentlens.rca.fallback").increment(); report = rules.analyze(packageEvidence); }
        } else report = rules.analyze(packageEvidence);
        RcaValidator.validate(report, packageEvidence);
        jdbc.update("INSERT INTO rca_report(session_id,report_json,generated_at) VALUES(?,?,?) ON DUPLICATE KEY UPDATE report_json=VALUES(report_json),generated_at=VALUES(generated_at)",
                sessionId, json.write(report), Timestamp.from(report.generatedAt()));
        return report;
    }
    Models.Report get(String sessionId) {
        List<String> reports = jdbc.query("SELECT report_json FROM rca_report WHERE session_id=?", (rs, n) -> rs.getString(1), sessionId);
        return reports.isEmpty() ? null : json.read(reports.getFirst(), Models.Report.class);
    }
}
