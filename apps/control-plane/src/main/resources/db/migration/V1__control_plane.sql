CREATE TABLE incident_session (
 id CHAR(36) PRIMARY KEY,
 name VARCHAR(120) NOT NULL,
 scenario VARCHAR(40) NOT NULL,
 status VARCHAR(24) NOT NULL,
 created_at TIMESTAMP(6) NOT NULL,
 updated_at TIMESTAMP(6) NOT NULL
);
CREATE INDEX ix_session_created ON incident_session(created_at);
CREATE TABLE fault_activation (
 id CHAR(36) PRIMARY KEY,
 session_id CHAR(36) NOT NULL,
 enabled BOOLEAN NOT NULL,
 parameter_value INT NOT NULL,
 occurred_at TIMESTAMP(6) NOT NULL,
 CONSTRAINT fk_activation_session FOREIGN KEY(session_id) REFERENCES incident_session(id)
);
CREATE INDEX ix_activation_session ON fault_activation(session_id, occurred_at);
CREATE TABLE evidence (
 id CHAR(36) PRIMARY KEY,
 session_id CHAR(36) NOT NULL,
 window_start TIMESTAMP(6) NOT NULL,
 window_end TIMESTAMP(6) NOT NULL,
 source VARCHAR(180) NOT NULL,
 service VARCHAR(40) NOT NULL,
 evidence_type VARCHAR(60) NOT NULL,
 metric_value DOUBLE NULL,
 unit VARCHAR(24) NOT NULL,
 trace_id VARCHAR(64) NULL,
 explanation VARCHAR(2000) NOT NULL,
 phase VARCHAR(12) NOT NULL,
 CONSTRAINT fk_evidence_session FOREIGN KEY(session_id) REFERENCES incident_session(id)
);
CREATE INDEX ix_evidence_session ON evidence(session_id, window_end);
CREATE TABLE rca_report (
 session_id CHAR(36) PRIMARY KEY,
 report_json LONGTEXT NOT NULL,
 generated_at TIMESTAMP(6) NOT NULL,
 CONSTRAINT fk_report_session FOREIGN KEY(session_id) REFERENCES incident_session(id)
);
CREATE TABLE experiment (
 id CHAR(36) PRIMARY KEY,
 session_id CHAR(36) NOT NULL UNIQUE,
 status VARCHAR(24) NOT NULL,
 vus INT NOT NULL,
 duration_seconds INT NOT NULL,
 before_json LONGTEXT NULL,
 after_json LONGTEXT NULL,
 created_at TIMESTAMP(6) NOT NULL,
 run_started_at TIMESTAMP(6) NULL,
 CONSTRAINT fk_experiment_session FOREIGN KEY(session_id) REFERENCES incident_session(id)
);
CREATE TABLE lab_lock (
 id INT PRIMARY KEY,
 experiment_id CHAR(36) NULL,
 phase VARCHAR(12) NULL,
 lease_until TIMESTAMP(6) NULL
);
INSERT INTO lab_lock(id) VALUES(1);
