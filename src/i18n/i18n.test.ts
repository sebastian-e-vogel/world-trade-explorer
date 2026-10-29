import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TradeDashboard } from "../components/TradeDashboard";
import { CountrySelector } from "../components/CountrySelector";
import { LanguageProvider } from "./LanguageContext";
import { adaptProfile } from "../data/comtradeAdapter";
import argentina from "../../tests/fixtures/32.json";
import { afterEach, describe, expect, it } from "vitest";
import { i18n, translate } from "./engine";
import {
  messages,
  readLanguage,
  type Language,
  type MessageKey,
} from "./messages";
import {
  countryName,
  mapCountryName,
  matchesCountry,
  productName,
  issueMessage,
  formatDate,
} from "./labels";
import {
  partnerForM49,
  countryForM49,
  mapIdForM49,
} from "../data/countryMapping";
import { exactUsd, percent } from "../lib/format";
afterEach(async () => {
  await i18n.changeLanguage("es");
});
describe("i18next integration", () => {
  it("has matching interface keys and interpolation variables in both languages", () => {
    expect(Object.keys(messages.es).sort()).toEqual(
      Object.keys(messages.en).sort(),
    );
    for (const key of Object.keys(messages.en) as MessageKey[]) {
      expect(messages.es[key].trim()).not.toBe("");
      expect(messages.es[key].match(/\{\w+\}/g)?.sort() ?? []).toEqual(
        messages.en[key].match(/\{\w+\}/g)?.sort() ?? [],
      );
    }
  });
  it("switches language with the real i18next instance", async () => {
    expect(i18n.isInitialized).toBe(true);
    await i18n.changeLanguage("en");
    expect(i18n.t("year")).toBe("Year");
    await i18n.changeLanguage("es");
    expect(i18n.t("year")).toBe("Año");
    expect(translate("es", "searchPlaceholder", { country: "Argentina" })).toBe(
      "Explorar un país · Argentina",
    );
  });
  it("defaults to Spanish and tolerates unavailable preferences storage", () => {
    expect(readLanguage()).toBe("es");
    expect(readLanguage({ getItem: () => "en" })).toBe("en");
    expect(readLanguage({ getItem: () => "fr" })).toBe("es");
    expect(
      readLanguage({
        getItem: () => {
          throw new Error("denied");
        },
      }),
    ).toBe("es");
  });
});
describe("localized display names", () => {
  for (const language of ["es", "en"] as Language[]) {
    it(`always displays Islas Malvinas in ${language}, without changing UN reference codes`, () => {
      const reference = partnerForM49(238)!;
      const originalName = reference.name;
      expect(countryName("238", language)).toBe("Islas Malvinas");
      expect(mapCountryName("238", language, "Falkland Is.")).toBe(
        "Islas Malvinas",
      );
      expect(mapIdForM49("238")).toBe("238");
      expect(reference.name).toBe(originalName);
    });
  }
  it("accepts country names in either language and ISO identifiers", () => {
    expect(countryName("76", "es")).toBe("Brasil");
    expect(countryName("76", "en")).toBe("Brazil");
    expect(matchesCountry(countryForM49("76")!, "Brazil", "es")).toBe(true);
    expect(matchesCountry(countryForM49("76")!, "Brasil", "en")).toBe(true);
    expect(matchesCountry(countryForM49("842")!, "USA", "es")).toBe(true);
  });
  it("translates HS2 labels while retaining English source labels and unknown codes", () => {
    expect(productName("10", "Cereals", "es")).toBe("Cereales");
    expect(productName("10", "Cereals", "en")).toBe("Cereals");
    expect(productName("01", "Live animals", "es")).toBe("Animales vivos");
    expect(productName("XX", "Original category", "es")).toBe(
      "Original category",
    );
    expect(countryName("810", "es")).toContain("Unión Soviética");
  });
  it("localizes error messages, percentages, currency and dates", () => {
    expect(issueMessage("quota", "es")).toContain("cuota diaria");
    expect(issueMessage("quota", "en")).toContain("daily quota");
    expect(percent(12.5, "es")).toContain("12,5");
    expect(percent(12.5, "en")).toContain("12.5");
    expect(exactUsd(1234.5, "es")).toContain("1.234,50");
    expect(exactUsd(1234.5, "en")).toContain("1,234.50");
    expect(formatDate("2025-01-15T12:00:00Z", "es")).toContain("ene");
    expect(formatDate("2025-01-15T12:00:00Z", "en")).toContain("Jan");
  });
});

describe("translated dashboard integration", () => {
  for (const language of ["es", "en"] as Language[]) {
    it(`renders the real saved profile in ${language}`, async () => {
      await i18n.changeLanguage(language);
      const profile = adaptProfile(
        "32",
        2025,
        argentina.total,
        argentina.hs2,
        argentina.partners,
      );
      const markup = renderToStaticMarkup(
        createElement(
          LanguageProvider,
          null,
          createElement(TradeDashboard, { profile }),
        ),
      );
      expect(markup).toContain(
        language === "es" ? "Principales exportaciones" : "Leading exports",
      );
      expect(markup).toContain(language === "es" ? "Cereales" : "Cereals");
      expect(markup).toContain(language === "es" ? "Brasil" : "Brazil");
      expect(profile.totalExportsUsd).toBe(
        argentina.total.data[0].primaryValue,
      );
      const selector = renderToStaticMarkup(
        createElement(
          LanguageProvider,
          null,
          createElement(CountrySelector, {
            selected: "32",
            onSelect: () => {},
          }),
        ),
      );
      expect(selector).not.toContain('value="Islas Malvinas"');
      expect(selector).not.toContain("Falkland");
    });
  }
});
