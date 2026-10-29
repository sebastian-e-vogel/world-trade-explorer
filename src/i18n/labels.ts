import {
  countryForM49,
  partnerForM49,
  type Country,
} from "../data/countryMapping";
import type { TradeIssueCode } from "../domain/trade";
import { i18n, translate } from "./engine";
import { locales, type Language } from "./messages";
const regionNames = {
  es: new Intl.DisplayNames(["es"], { type: "region", fallback: "none" }),
  en: new Intl.DisplayNames(["en"], { type: "region", fallback: "none" }),
};
export function countryName(
  code: string | number,
  language: Language,
  fallback = "",
): string {
  if (Number(code) === 238 || /falkland|malvinas/i.test(fallback))
    return i18n.getFixedT(language, "countries")("238");
  const country = countryForM49(code) ?? partnerForM49(Number(code));
  if (!country) return fallback || String(code);
  if (/\(\.\.\./.test(country.name))
    return i18n.getFixedT(language, "countries")(String(code), {
      defaultValue: country.name,
      fallbackLng: false,
    });
  try {
    return /^[A-Z]{2}$/.test(country.iso2)
      ? (regionNames[language].of(country.iso2) ?? country.name)
      : country.name;
  } catch {
    return country.name;
  }
}
export function mapCountryName(
  id: string,
  language: Language,
  fallback: string,
): string {
  if (Number(id) === 238 || /falkland|malvinas/i.test(fallback))
    return i18n.getFixedT(language, "countries")("238");
  return i18n.getFixedT(language, "countries")(`map.${fallback}`, {
    defaultValue: fallback,
    fallbackLng: false,
  });
}
const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLocaleLowerCase();
export function matchesCountry(
  country: Country,
  query: string,
  language: Language,
): boolean {
  const input = normalize(query);
  return [
    countryName(country.m49, language),
    countryName(country.m49, language === "es" ? "en" : "es"),
    country.name,
    country.iso3,
    country.iso2,
  ].some((name) => normalize(name) === input);
}
export const productName = (
  code: string,
  original: string,
  language: Language,
) =>
  i18n.getFixedT(language, "products")(code, {
    defaultValue: original,
    fallbackLng: false,
  });
export const issueMessage = (
  code: TradeIssueCode | undefined,
  language: Language,
) => translate(language, `error.${code ?? "unknown"}`);
export const formatDate = (date: string, language: Language) =>
  new Intl.DateTimeFormat(locales[language], {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(date));
