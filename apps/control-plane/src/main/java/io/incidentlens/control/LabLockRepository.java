package io.incidentlens.control;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.*;

interface LabLockRepository extends JpaRepository<LabLock, Integer> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select l from LabLock l where l.id = 1")
    LabLock acquire();
}
