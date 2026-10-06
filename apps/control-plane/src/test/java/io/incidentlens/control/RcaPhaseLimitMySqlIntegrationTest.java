package io.incidentlens.control;

import com.zaxxer.hikari.HikariDataSource;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Tag;
import org.springframework.jdbc.core.JdbcTemplate;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

/** The identical phase/limit/report/citation contracts run against a fresh MySQL database. */
@Tag("integration")
@Testcontainers
class RcaPhaseLimitMySqlIntegrationTest extends RcaPhaseLimitTest {
    @Container static final MySQLContainer<?> MYSQL = new MySQLContainer<>("mysql:8.4.6")
        .withTmpFs(java.util.Map.of("/var/lib/mysql", "rw,size=512m"));
    private HikariDataSource source;

    @Override protected JdbcTemplate database() {
        // Dense evidence fixtures should reuse JDBC connections, as the application does.
        // DriverManagerDataSource opened a new host-forwarded TCP connection for every row.
        source = new HikariDataSource();
        source.setJdbcUrl(MYSQL.getJdbcUrl());
        source.setUsername(MYSQL.getUsername());
        source.setPassword(MYSQL.getPassword());
        source.setMaximumPoolSize(2);
        source.setMinimumIdle(0);
        try {
            Flyway.configure().dataSource(source).load().migrate();
            return new JdbcTemplate(source);
        } catch (RuntimeException failure) {
            closeDatabase();
            throw failure;
        }
    }
    @Override protected void closeDatabase() {
        if (source != null) {
            source.close();
            source = null;
        }
        // Testcontainers retains ownership of the temporary MySQL instance.
    }
}
