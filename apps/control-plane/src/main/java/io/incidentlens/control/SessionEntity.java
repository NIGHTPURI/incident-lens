package io.incidentlens.control;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "incident_session")
class SessionEntity {
    @Id @Column(columnDefinition = "char(36)") String id;
    String name;
    @Enumerated(EnumType.STRING) Models.Scenario scenario;
    String status;
    Instant createdAt;
    Instant updatedAt;
    protected SessionEntity() {}
    SessionEntity(Models.CreateSession request) {
        id = UUID.randomUUID().toString(); name = request.name().strip(); scenario = request.scenario();
        status = "CREATED"; createdAt = updatedAt = Instant.now();
    }
    Models.Session view() { return new Models.Session(id, name, scenario, status, createdAt, updatedAt); }
}
