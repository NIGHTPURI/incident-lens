export function number(value: number | null | undefined, digits = 0): string {
  return value == null || !Number.isFinite(value)
    ? "Unavailable"
    : value.toLocaleString("en-US", { maximumFractionDigits: digits });
}

export function percent(value: number | null | undefined): string {
  return value == null || !Number.isFinite(value)
    ? "Unavailable"
    : `${number(value * 100, 1)}%`;
}

export function milliseconds(value: number | null | undefined): string {
  return value == null || !Number.isFinite(value)
    ? "Unavailable"
    : `${number(value, 1)} ms`;
}

export function date(value: string | null | undefined): string {
  if (!value) return "Unavailable";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? "Unavailable"
    : parsed.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
}

export function change(
  before: number | null | undefined,
  after: number | null | undefined,
): string {
  if (
    before == null ||
    after == null ||
    !Number.isFinite(before) ||
    !Number.isFinite(after)
  )
    return "—";
  if (before === 0) return after === 0 ? "0%" : "—";
  const delta = ((after - before) / Math.abs(before)) * 100;
  return `${delta > 0 ? "+" : ""}${number(delta, 1)}%`;
}
