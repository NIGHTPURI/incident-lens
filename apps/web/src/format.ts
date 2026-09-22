import { translate } from "./i18n/translations";
import type { Locale } from "./i18n/translations";

const locales = { ko: "ko-KR", en: "en-US" } as const;

export function number(
  value: number | null | undefined,
  digits = 0,
  locale: Locale = "en",
): string {
  return value == null || !Number.isFinite(value)
    ? translate(locale, "common.unavailable")
    : value.toLocaleString(locales[locale], { maximumFractionDigits: digits });
}

export function percent(
  value: number | null | undefined,
  locale: Locale = "en",
): string {
  return value == null || !Number.isFinite(value)
    ? translate(locale, "common.unavailable")
    : `${number(value * 100, 1, locale)}%`;
}

export function milliseconds(
  value: number | null | undefined,
  locale: Locale = "en",
): string {
  return value == null || !Number.isFinite(value)
    ? translate(locale, "common.unavailable")
    : `${number(value, 1, locale)} ms`;
}

export function date(
  value: string | null | undefined,
  locale: Locale = "en",
): string {
  if (!value) return translate(locale, "common.unavailable");
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? translate(locale, "common.unavailable")
    : parsed.toLocaleString(locales[locale], {
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
  locale: Locale = "en",
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
  return `${delta > 0 ? "+" : ""}${number(delta, 1, locale)}%`;
}
