package io.incidentlens.control;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "experiment")
class ExperimentEntity {
    @Id @Column(columnDefinition = "char(36)") String id;
    @Column(columnDefinition = "char(36)") String sessionId;
    String status;
    int vus;
    int durationSeconds;
    @Column(columnDefinition = "longtext") String beforeJson;
    @Column(columnDefinition = "longtext") String afterJson;
    Instant createdAt;
    Instant runStartedAt;
    protected ExperimentEntity() {}
    ExperimentEntity(String sessionId, Models.Workload workload) {
        id = UUID.randomUUID().toString(); this.sessionId = sessionId;
        status = "CREATED"; vus = workload.vus(); durationSeconds = workload.durationSeconds(); createdAt = Instant.now();
    }
}
