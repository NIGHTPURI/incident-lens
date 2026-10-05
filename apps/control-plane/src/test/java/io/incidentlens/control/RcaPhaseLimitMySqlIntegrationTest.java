package io.incidentlens.control;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Tag;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

/** The identical phase/limit/report/citation contracts run against a fresh MySQL database. */
@Tag("integration")
@Testcontainers
class RcaPhaseLimitMySqlIntegrationTest extends RcaPhaseLimitTest {
    @Container static final MySQLContainer<?> MYSQL = new MySQLContainer<>("mysql:8.4.6")
        .withTmpFs(java.util.Map.of("/var/lib/mysql", "rw,size=512m"));
    @Override protected JdbcTemplate database() {
        var source = new DriverManagerDataSource(MYSQL.getJdbcUrl(), MYSQL.getUsername(), MYSQL.getPassword());
        Flyway.configure().dataSource(source).load().migrate();
        return new JdbcTemplate(source);
    }
    @Override protected void closeDatabase() { /* Testcontainers owns only this temporary database. */ }
}
