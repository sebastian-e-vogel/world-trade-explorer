import reporters from "./reporters.json" with { type: "json" };

export interface Country {
  m49: string;
  iso3: string;
  iso2: string;
  name: string;
  mapId: string;
}

export const countries: Country[] = reporters
  .filter((country) => /^[A-Z]{3}$/.test(country.iso3))
  .sort((a, b) => a.name.localeCompare(b.name));
const byCode = new Map(countries.map((country) => [country.m49, country]));
const byIso = new Map(countries.map((country) => [country.iso3, country]));
const byMapId = new Map(countries.map((country) => [country.mapId, country]));

export const countryForM49 = (code: string | number) =>
  byCode.get(String(Number(code)));
export const countryForIso = (iso: string) => byIso.get(iso.toUpperCase());
// Comtrade reporting territories do not always use the map's numeric ISO code.
export const mapIdForM49 = (code: string) => countryForM49(code)?.mapId ?? "";
export const countryForMapId = (id: string | number) =>
  byMapId.get(String(Number(id)));
