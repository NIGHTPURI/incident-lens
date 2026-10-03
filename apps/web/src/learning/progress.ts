import { roadmap } from "./curriculum";
export const progressKey = "incidentlens.curriculum.v1";
export type Progress = { version: 1; stage: string; notes: Record<string, string>; read: string[]; evidence: Record<string, string> };
const legacy: Record<string, string> = { request: "http", database: "persistence", cache: "performance", async: "messaging", outbox: "messaging", diagnose: "observability" };
const valid = (id: unknown): id is string => typeof id === "string" && roadmap.some(stage => stage.id === id);
const strings = (value: unknown): Record<string, string> => value && typeof value === "object" && !Array.isArray(value)
  ? Object.fromEntries(Object.entries(value).filter(([key, item]) => valid(key) && typeof item === "string")) : {};
export function readProgress(storage: Pick<Storage, "getItem">): Progress {
  const empty: Progress = { version: 1, stage: "tools", notes: {}, read: [], evidence: {} };
  try {
    const raw = storage.getItem(progressKey);
    if (raw) {
      const value = JSON.parse(raw);
      if (value && value.version === 1) return { ...empty,
        stage: valid(value.stage) ? value.stage : "tools", notes: strings(value.notes), evidence: strings(value.evidence),
        read: Array.isArray(value.read) ? [...new Set<string>(value.read.filter(valid))] : [] };
    }
    // Do not rewrite or erase the old six-lesson records. Their predictions remain
    // available through the reference lessons, including async/outbox separately.
    const previous = storage.getItem("incidentlens.learning.lesson");
    return { ...empty, stage: previous && legacy[previous] || "tools" };
  } catch { return empty; }
}
export function saveProgress(storage: Pick<Storage, "setItem">, progress: Progress): boolean {
  try { storage.setItem(progressKey, JSON.stringify(progress)); return true; } catch { return false; }
}
