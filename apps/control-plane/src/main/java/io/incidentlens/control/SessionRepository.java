package io.incidentlens.control;

import org.springframework.data.jpa.repository.JpaRepository;

interface SessionRepository extends JpaRepository<SessionEntity, String> {}
