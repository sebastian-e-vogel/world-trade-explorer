import en from "./locales/en/translation.json";
export type Language = "en";
export const locales = { en: "en-US" };
export type MessageKey = keyof typeof en;
export const messages = { en };
