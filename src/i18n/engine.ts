import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import {
  messages,
  readLanguage,
  type Language,
  type MessageKey,
} from "./messages";
import productsEs from "./locales/es/products.json";
import countriesEs from "./locales/es/countries.json";
import countriesEn from "./locales/en/countries.json";
export const i18n = createInstance();
let initialLanguage: Language = "es";
try {
  if (typeof window !== "undefined")
    initialLanguage = readLanguage(window.localStorage);
} catch {
  /* Storage is optional. */
}
void i18n.use(initReactI18next).init({
  lng: initialLanguage,
  fallbackLng: "es",
  supportedLngs: ["es", "en"],
  initAsync: false,
  resources: {
    es: {
      translation: messages.es,
      products: productsEs,
      countries: countriesEs,
    },
    en: { translation: messages.en, products: {}, countries: countriesEn },
  },
  defaultNS: "translation",
  ns: ["translation", "products", "countries"],
  keySeparator: false,
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
});
export const translate = (
  language: Language,
  key: MessageKey,
  values?: Record<string, string | number>,
): string => i18n.getFixedT(language)(key, values);
