export type Scenario =
  | "DOWNSTREAM_LATENCY"
  | "DATABASE_DEGRADATION"
  | "KAFKA_SLOWDOWN"
  | "CACHE_DEGRADATION";

export interface IncidentSession {
  id: string;
  name: string;
  scenario: Scenario;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface Evidence {
  id: string;
  sessionId: string;
  windowStart: string;
  windowEnd: string;
  source: string;
  service: string;
  type: string;
  value: number | null;
  unit: string;
  traceId?: string | null;
  explanation: string;
  phase?: "BEFORE" | "AFTER";
}

export interface Report {
  summary: string;
  suspectedRootCause: string;
  confidence: number;
  evidenceIds: string[];
  impact: string;
  recommendedActions: string[];
  uncertainties: string[];
  provider: string;
  generatedAt: string;
}

export interface Metrics {
  durationSeconds?: number;
  requestCount: number | null;
  errorCount: number | null;
  throughput: number | null;
  successRate: number | null;
  p50Ms: number | null;
  p95Ms: number | null;
  p99Ms: number | null;
  dbQueryP95Ms: number | null;
  kafkaLag: number | null;
  cacheHitRate: number | null;
}

export interface Workload {
  vus: number;
  durationSeconds: number;
}

export interface Experiment {
  id: string;
  sessionId: string;
  status: string;
  workload: Workload;
  before: Metrics | null;
  after: Metrics | null;
  createdAt: string;
  execution?: {
    configuration: { profile: string; pcLabel: string; labInstanceId: string; configurationHash: string; hostPorts: Record<string,number>; memoryLimitsMiB: Record<string,number> } | null;
    before: {startedAt: string; endedAt: string | null} | null;
    after: {startedAt: string; endedAt: string | null} | null;
  };
}

export interface SessionDetail {
  session: IncidentSession;
  activations: { enabled: boolean; parameter: number; occurredAt: string }[];
  evidence: Evidence[];
  report: Report | null;
  experiments: Experiment[];
}

export interface Overview {
  services: { name: string; status: string }[];
  metrics: Pick<
    Metrics,
    "requestCount" | "errorCount" | "p95Ms" | "kafkaLag" | "cacheHitRate"
  >;
  activeFault: {
    sessionId: string;
    scenario: Scenario;
    enabled: boolean;
    parameter: number;
    expiresAt: string;
  } | null;
}
