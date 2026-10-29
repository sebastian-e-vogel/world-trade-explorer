import { useMemo, useState } from "react";
import { countries } from "../data/countryMapping";
import { useLanguage } from "../i18n/LanguageContext";
import { countryName, matchesCountry } from "../i18n/labels";
export function CountrySelector({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (code: string) => void;
}) {
  const { language, t } = useLanguage();
  const [text, setText] = useState("");
  const [error, setError] = useState(false);
  const options = useMemo(
    () =>
      countries
        .map((country) => ({
          ...country,
          label: countryName(country.m49, language),
        }))
        .sort((a, b) => a.label.localeCompare(b.label, language)),
    [language],
  );
  const choose = () => {
    const country = countries.find((country) =>
      matchesCountry(country, text, language),
    );
    if (country) {
      onSelect(country.m49);
      setText("");
      setError(false);
    } else setError(true);
  };
  return (
    <form
      className="country-search"
      onSubmit={(event) => {
        event.preventDefault();
        choose();
      }}
    >
      <label htmlFor="country-search" className="sr-only">
        {t("searchLabel")}
      </label>
      <span aria-hidden="true" className="search-icon">
        ⌕
      </span>
      <input
        id="country-search"
        type="search"
        list="reporting-countries"
        placeholder={t("searchPlaceholder", {
          country: countryName(selected, language),
        })}
        value={text}
        onChange={(event) => {
          setText(event.target.value);
          setError(false);
        }}
        aria-describedby={error ? "search-error" : undefined}
        autoComplete="off"
      />
      <datalist id="reporting-countries">
        {options.map((country) => (
          <option key={country.m49} value={country.label}>
            {country.iso3}
          </option>
        ))}
      </datalist>
      <button type="submit" aria-label={t("exploreCountry")}>
        {t("explore")} <span aria-hidden="true">↗</span>
      </button>
      {error && (
        <span id="search-error" className="search-error" role="alert">
          {t("searchError")}
        </span>
      )}
    </form>
  );
}
