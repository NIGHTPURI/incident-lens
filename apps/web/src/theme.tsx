import { useLayoutEffect, useState } from 'react';
import { useI18n } from './i18n/I18nProvider';
export const THEME_STORAGE_KEY = 'incidentlens.theme.v1';
export type ThemePreference = 'light' | 'dark';
function readTheme(): ThemePreference {
  let saved: string | null = null;
  try { saved = localStorage.getItem(THEME_STORAGE_KEY); } catch { /* Session-only choice. */ }
  if (saved === 'light' || saved === 'dark') return saved;
  const resolved = window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  try { localStorage.setItem(THEME_STORAGE_KEY, resolved); } catch { /* Session-only choice. */ }
  return resolved;
}
export function useThemePreference() {
  const [preference, setPreference] = useState<ThemePreference>(readTheme);
  useLayoutEffect(() => {
    document.documentElement.dataset.theme = preference;
    document.documentElement.style.colorScheme = preference;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', preference === 'dark' ? '#11161f' : '#ffffff');
  }, [preference]);
  useLayoutEffect(() => {
    const sync = (e: StorageEvent) => { if (e.key === THEME_STORAGE_KEY || e.key === null) setPreference(readTheme()); };
    window.addEventListener('storage', sync); return () => window.removeEventListener('storage', sync);
  }, []);
  const choose = (next: ThemePreference) => { setPreference(next); try { localStorage.setItem(THEME_STORAGE_KEY, next); } catch { /* Keep session choice. */ } };
  return { preference, choose };
}
export default function ThemeSelector({ preference, choose }: ReturnType<typeof useThemePreference>) {
  const { locale } = useI18n();
  const next = preference === 'dark' ? 'light' : 'dark';
  const label = locale === 'ko' ? (next === 'dark' ? '다크 모드로 전환' : '라이트 모드로 전환') : (next === 'dark' ? 'Switch to dark mode' : 'Switch to light mode');
  return <button type="button" className="theme-toggle" onClick={() => choose(next)} aria-label={label} title={label}><svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">{preference === 'dark' ? <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" /></> : <path d="M20.5 14A8.5 8.5 0 0 1 10 3.5 8.5 8.5 0 1 0 20.5 14Z" />}</svg></button>;
}
