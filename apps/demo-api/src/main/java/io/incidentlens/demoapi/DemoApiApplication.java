package io.incidentlens.demoapi;

import io.incidentlens.common.CommonConfiguration;
import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.info.Info;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Import;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@OpenAPIDefinition(info = @Info(title = "IncidentLens Demo API", version = "0.1.0",
        description = "Catalog and idempotent order APIs with transactional outbox delivery for the local incident lab."))
@EnableScheduling
@Import(CommonConfiguration.class)
public class DemoApiApplication {
    public static void main(String[] args) { SpringApplication.run(DemoApiApplication.class, args); }
}
