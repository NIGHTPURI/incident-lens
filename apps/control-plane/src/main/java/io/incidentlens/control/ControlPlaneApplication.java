package io.incidentlens.control;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;
import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.info.Info;

@SpringBootApplication(scanBasePackages = {"io.incidentlens.control", "io.incidentlens.common"})
@EnableScheduling
@OpenAPIDefinition(info = @Info(title = "IncidentLens Control API", version = "0.1.0",
    description = "Incident sessions, controlled faults, evidence-cited analysis, and repeatable workload comparisons. Local laboratory access only."))
public class ControlPlaneApplication {
    public static void main(String[] args) { SpringApplication.run(ControlPlaneApplication.class, args); }
}
