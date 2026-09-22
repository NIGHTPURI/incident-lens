import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";
import { translate } from "./translations";
import type { Locale, TranslationKey, TranslationParams } from "./translations";

export const LOCALE_STORAGE_KEY = "incidentlens.locale";

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey, params?: TranslationParams) => string;
};

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

function readLocale(): Locale {
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    return stored === "en" || stored === "ko" ? stored : "ko";
  } catch {
    // A browser may deny storage while the rest of the UI remains usable.
    return "ko";
  }
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, updateLocale] = useState<Locale>(readLocale);
  const setLocale = useCallback((nextLocale: Locale) => {
    updateLocale(nextLocale);
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, nextLocale);
    } catch {
      // Keep the language choice for this mounted app when persistence is denied.
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = translate(locale, "shell.documentTitle");
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute("content", translate(locale, "shell.description"));
  }, [locale]);

  const t = useCallback(
    (key: TranslationKey, params?: TranslationParams) =>
      translate(locale, key, params),
    [locale],
  );
  const value = useMemo(
    () => ({ locale, setLocale, t }),
    [locale, setLocale, t],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n must be used within I18nProvider");
  return context;
}
