package io.incidentlens.demoapi;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public class OutboxStore {
    private final JdbcTemplate jdbc;
    public OutboxStore(JdbcTemplate jdbc) { this.jdbc = jdbc; }
    @Transactional
    public Optional<Claim> claim() {
        List<Claim> rows = jdbc.query("SELECT id,aggregate_id,payload,attempt_count FROM outbox_event "
                + "WHERE published_at IS NULL AND next_attempt_at<=CURRENT_TIMESTAMP(6) "
                + "AND (leased_until IS NULL OR leased_until<CURRENT_TIMESTAMP(6)) ORDER BY created_at LIMIT 1 FOR UPDATE SKIP LOCKED",
                (rs, n) -> new Claim(rs.getString(1), rs.getString(2), rs.getString(3), UUID.randomUUID().toString(), rs.getInt(4) + 1));
        if (rows.isEmpty()) return Optional.empty();
        Claim claim = rows.getFirst();
        jdbc.update("UPDATE outbox_event SET lease_token=?,leased_until=DATE_ADD(CURRENT_TIMESTAMP(6),INTERVAL 15 SECOND),attempt_count=attempt_count+1 WHERE id=?",
                claim.token(), claim.id());
        return Optional.of(claim);
    }
    public boolean published(Claim claim) {
        return jdbc.update("UPDATE outbox_event SET published_at=CURRENT_TIMESTAMP(6),leased_until=NULL,lease_token=NULL,last_error=NULL WHERE id=? AND lease_token=?",
                claim.id(), claim.token()) == 1;
    }
    public void failed(Claim claim, String errorType) {
        long delaySeconds = Math.min(60, 1L << Math.min(claim.attempt(), 6));
        jdbc.update("UPDATE outbox_event SET leased_until=NULL,lease_token=NULL,next_attempt_at=DATE_ADD(CURRENT_TIMESTAMP(6),INTERVAL ? SECOND),last_error=? "
                + "WHERE id=? AND lease_token=?", delaySeconds, errorType, claim.id(), claim.token());
    }
    public long pending() { Long count = jdbc.queryForObject("SELECT COUNT(*) FROM outbox_event WHERE published_at IS NULL", Long.class); return count == null ? 0 : count; }
    public record Claim(String id, String aggregateId, String payload, String token, int attempt) { }
}
