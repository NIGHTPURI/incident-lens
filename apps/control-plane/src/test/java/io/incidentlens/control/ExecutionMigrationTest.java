package io.incidentlens.control;

import java.sql.DriverManager;
import java.util.UUID;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;

/** Upgrades a test-owned V1 database containing records; never cleans or rewrites prior data. */
class ExecutionMigrationTest {
    private final String database = "jdbc:h2:mem:migration" + UUID.randomUUID() + ";MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1";
    String url() { return database; }
    String user() { return "sa"; }
    String password() { return ""; }
    @Test void v2AddsNullableContextWithoutRewritingSavedSessionsReportsOrMeasurements() throws Exception {
        Flyway.configure().dataSource(url(), user(), password()).target("1").load().migrate();
        String session = UUID.randomUUID().toString(), experiment = UUID.randomUUID().toString();
        try (var db = DriverManager.getConnection(url(), user(), password())) {
            try (var insert = db.prepareStatement("INSERT INTO incident_session VALUES(?, 'Prior session', 'CACHE_DEGRADATION', 'CREATED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)")) {
                insert.setString(1, session); insert.executeUpdate();
            }
            try (var insert = db.prepareStatement("INSERT INTO experiment(id,session_id,status,vus,duration_seconds,before_json,created_at) VALUES(?,?,'BEFORE_COMPLETE',2,10,'{\"p95Ms\":42}',CURRENT_TIMESTAMP)")) {
                insert.setString(1, experiment); insert.setString(2, session); insert.executeUpdate();
            }
            try (var insert = db.prepareStatement("INSERT INTO rca_report VALUES(?, '{\"summary\":\"prior report\"}', CURRENT_TIMESTAMP)")) {
                insert.setString(1, session); insert.executeUpdate();
            }
        }
        assertThat(Flyway.configure().dataSource(url(), user(), password()).load().migrate().migrationsExecuted).isEqualTo(1);
        try (var db = DriverManager.getConnection(url(), user(), password()); var query = db.createStatement()) {
            try (var row = query.executeQuery("SELECT * FROM experiment")) {
                assertThat(row.next()).isTrue(); assertThat(row.getString("id")).isEqualTo(experiment);
                assertThat(row.getString("status")).isEqualTo("BEFORE_COMPLETE");
                assertThat(row.getString("before_json")).isEqualTo("{\"p95Ms\":42}");
                for (String column : new String[]{"configuration_json", "before_started_at", "before_ended_at", "after_started_at", "after_ended_at"}) assertThat(row.getObject(column)).isNull();
            }
            try (var row = query.executeQuery("SELECT name FROM incident_session")) { assertThat(row.next()).isTrue(); assertThat(row.getString(1)).isEqualTo("Prior session"); }
            try (var row = query.executeQuery("SELECT report_json FROM rca_report")) { assertThat(row.next()).isTrue(); assertThat(row.getString(1)).isEqualTo("{\"summary\":\"prior report\"}"); }
        }
    }
}
