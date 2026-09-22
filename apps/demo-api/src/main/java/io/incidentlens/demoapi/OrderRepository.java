package io.incidentlens.demoapi;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import java.util.Optional;

public interface OrderRepository extends JpaRepository<PurchaseOrder, String> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<PurchaseOrder> findByIdempotencyKey(String key);
}
