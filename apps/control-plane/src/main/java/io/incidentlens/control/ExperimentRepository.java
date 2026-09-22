package io.incidentlens.control;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

interface ExperimentRepository extends JpaRepository<ExperimentEntity, String> {
    List<ExperimentEntity> findBySessionId(String sessionId);
}
