import reporters from "./reporters.json" with { type: "json" };
import partners from "./partners.json" with { type: "json" };
export interface Country {
  m49: string;
  iso3: string;
  iso2: string;
  name: string;
  mapId: string;
}
export const countries: Country[] = reporters
  .filter((c) => /^[A-Z]{3}$/.test(c.iso3))
  .sort((a, b) => a.name.localeCompare(b.name));
const byCode = new Map(countries.map((c) => [c.m49, c]));
const byIso = new Map(countries.map((c) => [c.iso3, c]));
export const countryForM49 = (code: string | number) =>
  byCode.get(String(Number(code)));
export const countryForIso = (iso: string) => byIso.get(iso.toUpperCase());
// Resolve trade statistical territories through ISO, never equate trade and map codes.
const partnerByCode = new Map(partners.map((c) => [c.m49, c]));
const byMapId = new Map(countries.map((c) => [c.mapId, c]));
export const mapIdForM49 = (code: string) =>
  countryForM49(code)?.mapId ??
  partnerByCode.get(String(Number(code)))?.mapId ??
  "";
export const countryForMapId = (id: string | number) =>
  byMapId.get(String(Number(id)));
export const partnerForM49 = (code: number) => partnerByCode.get(String(code));
// The normalized official table excludes groups/residual areas, while retaining historic destinations.
export function isGeographicPartner(code: number): boolean {
  return code !== 0 && partnerByCode.has(String(code));
}
