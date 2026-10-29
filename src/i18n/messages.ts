import en from "./locales/en/translation.json";
import es from "./locales/es/translation.json";
export type Language = "es" | "en";
export const locales: Record<Language, string> = { es: "es-AR", en: "en-US" };
export type MessageKey = keyof typeof en;
export const messages: Record<Language, Record<MessageKey, string>> = {
  en,
  es,
};
export const LANGUAGE_STORAGE_KEY = "world-trade-explorer.language";
export function readLanguage(storage?: Pick<Storage, "getItem">): Language {
  try {
    return storage?.getItem(LANGUAGE_STORAGE_KEY) === "en" ? "en" : "es";
  } catch {
    return "es";
  }
}
