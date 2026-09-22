package io.incidentlens.control;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "lab_lock")
class LabLock {
    @Id Integer id;
    @Column(columnDefinition = "char(36)") String experimentId;
    String phase;
    Instant leaseUntil;
    boolean running() { return experimentId != null && leaseUntil != null && leaseUntil.isAfter(Instant.now()); }
    void clear() { experimentId = null; phase = null; leaseUntil = null; }
}
