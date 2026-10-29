import { locales, type Language } from "../i18n/messages";
export const usd = (value: number, language: Language = "en") =>
  new Intl.NumberFormat(locales[language], {
    style: "currency",
    currency: "USD",
    currencyDisplay: "narrowSymbol",
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(value);
export const exactUsd = (value: number, language: Language = "en") =>
  new Intl.NumberFormat(locales[language], {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
export const percent = (value: number, language: Language = "en") =>
  new Intl.NumberFormat(locales[language], {
    style: "percent",
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  }).format(value / 100);
