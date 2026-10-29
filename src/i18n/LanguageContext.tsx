import { useEffect, type ReactNode } from "react";
import { I18nextProvider, useTranslation } from "react-i18next";
import { i18n } from "./engine";
import {
  LANGUAGE_STORAGE_KEY,
  type Language,
  type MessageKey,
} from "./messages";
function LanguageSettings({ children }: { children: ReactNode }) {
  const { i18n: instance } = useTranslation();
  const language = instance.resolvedLanguage === "en" ? "en" : "es";
  useEffect(() => {
    document.documentElement.lang = language;
    try {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    } catch {
      /* Language switching also works without storage. */
    }
  }, [language]);
  return <>{children}</>;
}
export function LanguageProvider({ children }: { children: ReactNode }) {
  return (
    <I18nextProvider i18n={i18n}>
      <LanguageSettings>{children}</LanguageSettings>
    </I18nextProvider>
  );
}
export function useLanguage() {
  const { t, i18n: instance } = useTranslation();
  return {
    language: (instance.resolvedLanguage === "en" ? "en" : "es") as Language,
    setLanguage: (language: Language) => {
      void instance.changeLanguage(language);
    },
    t: (key: MessageKey, values?: Record<string, string | number>): string =>
      t(key, values),
  };
}
