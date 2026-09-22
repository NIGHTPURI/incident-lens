package io.incidentlens.demoworker;

import io.incidentlens.common.CommonConfiguration;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Import;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
@Import(CommonConfiguration.class)
public class DemoWorkerApplication {
    public static void main(String[] args) { SpringApplication.run(DemoWorkerApplication.class, args); }
}
