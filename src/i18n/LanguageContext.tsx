import { useEffect, type ReactNode } from "react";
import { I18nextProvider, useTranslation } from "react-i18next";
import { i18n } from "./engine";
import type { MessageKey } from "./messages";
function LanguageSettings({ children }: { children: ReactNode }) {
  useEffect(() => { document.documentElement.lang = "en"; }, []);
  return <>{children}</>;
}
export function LanguageProvider({ children }: { children: ReactNode }) {
  return <I18nextProvider i18n={i18n}><LanguageSettings>{children}</LanguageSettings></I18nextProvider>;
}
export function useLanguage() {
  const { t } = useTranslation();
  return { language: "en" as const,
    t: (key: MessageKey, values?: Record<string, string | number>): string => t(key, values),
  };
}
