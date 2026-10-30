import { describe, expect, it } from "vitest";
import { countries, countryForIso, countryForM49, countryForMapId, mapIdForM49, partnerForM49, isGeographicPartner } from "./countryMapping";

describe("country identifier mapping", () => {
  it.each([258, 360, 583, 608, 670])("retains geographic partner %s even when its name contains nes", (code) => {
    expect(isGeographicPartner(code)).toBe(true);
    expect(partnerForM49(code)?.iso3).toMatch(/^[A-Z]{3}$/);
  });

  it("excludes residual areas from geographic destination rankings", () => {
    expect(isGeographicPartner(0)).toBe(false);
    expect(isGeographicPartner(899)).toBe(false);
    expect(isGeographicPartner(490)).toBe(false);
  });
  it("joins statistical territories to geography through ISO references", () => {
    expect(mapIdForM49("842")).toBe("840");
    expect(mapIdForM49("699")).toBe("356");
    expect(mapIdForM49("251")).toBe("250");
    expect(countryForMapId("840")?.m49).toBe("842");
  });
  it("accepts case-insensitive ISO codes and padded numeric identifiers", () => {
    expect(countryForIso("arg")?.m49).toBe("32");
    expect(countryForM49("032")?.iso3).toBe("ARG");
    expect(countryForMapId("032")?.m49).toBe("32");
  });
  it("leaves unsupported territories without a selectable reporter", () => {
    expect(countryForMapId("238")).toBeUndefined();
    expect(countryForM49("999999")).toBeUndefined();
    expect(mapIdForM49("999999")).toBe("");
  });
  it("keeps reporter identifiers unique and usable by the country selector", () => {
    expect(new Set(countries.map((country) => country.m49)).size).toBe(countries.length);
    expect(countries.every((country) => /^[A-Z]{3}$/.test(country.iso3))).toBe(true);
  });
});
