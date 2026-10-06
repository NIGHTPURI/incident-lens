package io.incidentlens.control;

import org.junit.jupiter.api.Tag;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@Tag("integration")
@Testcontainers
class ExecutionMigrationMySqlIntegrationTest extends ExecutionMigrationTest {
    @Container static final MySQLContainer<?> MYSQL = new MySQLContainer<>("mysql:8.4.6")
        .withTmpFs(java.util.Map.of("/var/lib/mysql", "rw,size=512m"))
        .withStartupTimeoutSeconds(240).withConnectTimeoutSeconds(90);
    @Override String url() { return MYSQL.getJdbcUrl(); }
    @Override String user() { return MYSQL.getUsername(); }
    @Override String password() { return MYSQL.getPassword(); }
}
