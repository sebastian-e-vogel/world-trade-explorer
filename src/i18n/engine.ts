import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import { messages, type Language, type MessageKey } from "./messages";
import countriesEn from "./locales/en/countries.json";
export const i18n = createInstance();
void i18n.use(initReactI18next).init({
  lng: "en", fallbackLng: "en", supportedLngs: ["en"], initAsync: false,
  resources: { en: { translation: messages.en, products: {}, countries: countriesEn } },
  defaultNS: "translation", ns: ["translation", "products", "countries"],
  keySeparator: false, interpolation: { escapeValue: false }, react: { useSuspense: false },
});
export const translate = (language: Language, key: MessageKey, values?: Record<string, string | number>): string =>
  i18n.getFixedT(language)(key, values);
