import { useLayoutEffect, useState } from "react";
import { useI18n } from "./i18n/I18nProvider";

export const THEME_STORAGE_KEY = "incidentlens.theme.v1";
export type ThemePreference = "light" | "dark" | "system";
function validTheme(value: string | null): ThemePreference {
  return value === "light" || value === "dark" ? value : "system";
}
function readTheme(): ThemePreference {
  try { return validTheme(localStorage.getItem(THEME_STORAGE_KEY)); }
  catch { return "system"; }
}

export function useThemePreference() {
  const [preference, setPreference] = useState<ThemePreference>(readTheme);
  useLayoutEffect(() => {
    const media = window.matchMedia?.("(prefers-color-scheme: dark)");
    const apply = () => {
      const resolved = preference === "system" ? (media?.matches ? "dark" : "light") : preference;
      document.documentElement.dataset.theme = resolved;
      document.documentElement.style.colorScheme = resolved;
      document.querySelector('meta[name="theme-color"]')?.setAttribute("content", resolved === "dark" ? "#11161f" : "#ffffff");
    };
    apply();
    media?.addEventListener("change", apply);
    return () => media?.removeEventListener("change", apply);
  }, [preference]);
  useLayoutEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key === THEME_STORAGE_KEY || event.key === null) setPreference(readTheme());
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  const choose = (next: ThemePreference) => {
    setPreference(next);
    try { localStorage.setItem(THEME_STORAGE_KEY, next); } catch { /* Retain this session's choice if storage is denied. */ }
  };
  return { preference, choose };
}

export default function ThemeSelector({ preference, choose }: ReturnType<typeof useThemePreference>) {
  const { locale } = useI18n();
  const ko = locale === "ko";
  return <label className="theme-control">
    <span>{ko ? "테마" : "Theme"}</span>
    <select className="theme-select" aria-label={ko ? "테마" : "Theme"} value={preference} onChange={event => choose(validTheme(event.target.value))}>
      <option value="system">{ko ? "시스템" : "System"}</option>
      <option value="light">{ko ? "라이트" : "Light"}</option>
      <option value="dark">{ko ? "다크" : "Dark"}</option>
    </select>
  </label>;
}
