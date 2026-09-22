import { translate } from "./i18n/translations";
import type {
  Experiment,
  IncidentSession,
  Overview,
  Report,
  Scenario,
  SessionDetail,
  Workload,
  Evidence,
} from "./types";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly detail?: string,
  ) {
    super(message);
  }
}

export async function request<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
    signal: init.signal ?? AbortSignal.timeout(30_000),
  });
  if (!response.ok) {
    const problem = (await response.json().catch(() => null)) as {
      detail?: string;
      message?: string;
      title?: string;
    } | null;
    const detail = problem?.detail ?? problem?.message ?? problem?.title;
    throw new ApiError(
      detail ?? translate("en", "error.http", { status: response.status }),
      response.status,
      detail,
    );
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const api = {
  overview: () => request<Overview>("/overview"),
  sessions: () => request<IncidentSession[]>("/sessions"),
  session: (id: string) =>
    request<SessionDetail>(`/sessions/${encodeURIComponent(id)}`),
  createSession: (name: string, scenario: Scenario) =>
    request<IncidentSession>("/sessions", {
      method: "POST",
      body: JSON.stringify({ name, scenario }),
    }),
  setFault: (id: string, enabled: boolean, parameter: number) =>
    request<unknown>(`/sessions/${encodeURIComponent(id)}/fault`, {
      method: "PUT",
      body: JSON.stringify({ enabled, parameter }),
    }),
  collect: (id: string, phase: "BEFORE" | "AFTER" = "BEFORE") =>
    request<Evidence[]>(
      `/sessions/${encodeURIComponent(id)}/evidence?phase=${phase}`,
      {
        method: "POST",
      },
    ),
  analyze: (id: string) =>
    request<Report>(`/sessions/${encodeURIComponent(id)}/rca`, {
      method: "POST",
    }),
  createExperiment: (id: string, workload: Workload) =>
    request<Experiment>(`/sessions/${encodeURIComponent(id)}/experiments`, {
      method: "POST",
      body: JSON.stringify(workload),
    }),
};
