import { useState } from "react";
import { countries } from "../data/countryMapping";
const normalize = (value: string) => value.normalize("NFD").replace(/\p{Diacritic}/gu, "").trim().toLowerCase();

export function CountrySelector({ selected, onSelect }: { selected: string; onSelect: (code: string) => void }) {
  const [text, setText] = useState("");
  const [error, setError] = useState(false);
  return <form className="country-search" onSubmit={(event) => {
    event.preventDefault();
    const input = normalize(text);
    const country = countries.find((item) => [item.name, item.iso3, item.iso2].some((value) => normalize(value) === input));
    if (country) { onSelect(country.m49); setText(""); setError(false); }
    else setError(true);
  }}>
    <label htmlFor="country-search">Find a country</label>
    <div className="search-controls">
      <input id="country-search" type="search" list="reporting-countries" autoComplete="off"
        placeholder={`Country name or ISO code · ${selected}`} value={text}
        aria-describedby={error ? "search-error" : undefined}
        onChange={(event) => { setText(event.target.value); setError(false); }} />
      <button type="submit">Explore ↗</button>
    </div>
    <datalist id="reporting-countries">{countries.map((country) =>
      <option key={country.m49} value={country.name}>{country.iso3}</option>
    )}</datalist>
    {error && <span id="search-error" className="search-error" role="alert">Choose a country from the list, or enter its ISO code.</span>}
  </form>;
}
