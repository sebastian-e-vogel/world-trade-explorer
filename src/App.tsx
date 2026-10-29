import { useState } from "react";
import { CountrySelector } from "./components/CountrySelector";
import { WorldMap } from "./components/WorldMap";
import { TradeDashboard } from "./components/TradeDashboard";
import { countryForM49, mapIdForM49 } from "./data/countryMapping";
import { useCountryTrade } from "./hooks/useCountryTrade";
import { useLanguage } from "./i18n/LanguageContext";
import { countryName, issueMessage, mapCountryName } from "./i18n/labels";
import { TradeError } from "./lib/errors";
function Globe() {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <circle cx="16" cy="16" r="12" />
      <ellipse cx="16" cy="16" rx="5.5" ry="12" />
      <path d="M4 16h24M6 9.5h20M6 22.5h20" />
    </svg>
  );
}
export function App() {
  const { language, t } = useLanguage();
  const [country, setCountry] = useState("32");
  const [requestedYear, setRequestedYear] = useState<number>();
  const [notice, setNotice] = useState<string>();
  const { availability, profile, years, year } = useCountryTrade(
    country,
    requestedYear,
  );
  const select = (code: string) => {
    if (code !== country) {
      setCountry(code);
      setRequestedYear(undefined);
    }
    setNotice(undefined);
  };
  const selected = countryForM49(country)!;
  const buyers =
    profile.data?.topBuyers.status === "complete"
      ? profile.data.topBuyers.items
      : [];
  const error = availability.error ?? profile.error;
  const noData = availability.isSuccess && !years.length;
  const loading =
    availability.isPending || (year !== undefined && profile.isPending);
  return (
    <div className="app-shell">
      <header className="app-header">
        <a href="/" className="brand" aria-label={t("home")}>
          <span className="brand-icon">
            <Globe />
          </span>
          <span>
            WORLD TRADE<span className="brand-light">EXPLORER</span>
          </span>
        </a>
        <div className="header-right">
          <span className="source-badge">
            <i />
            {t("sourceBadge")}
          </span>
          <a
            href="https://uncomtrade.org/docs/policy-on-comtrade-data-use/"
            className="about-link"
            target="_blank"
            rel="noreferrer"
          >
            {t("aboutData")} <span>↗</span>
          </a>
        </div>
      </header>
      <main>
        <div className="intro">
          <div>
            <div className="eyebrow">{t("introEyebrow")}</div>
            <h1>
              {t("introStart")} <span>{t("introAccent")}</span>
            </h1>
            <p>{t("introDescription")}</p>
          </div>
          <CountrySelector selected={country} onSelect={select} />
        </div>
        <div className="explorer-grid">
          <section className="map-panel" aria-label={t("mapRegion")}>
            <div className="map-panel-top">
              <span>
                <i />
                {t("networkLabel")}
              </span>
              <span className="map-coordinates">{t("annualMerchandise")}</span>
            </div>
            {buyers.some((buyer) => !mapIdForM49(buyer.countryCode)) && (
              <p className="map-notice">{t("historicalNotice")}</p>
            )}
            <WorldMap
              selected={country}
              buyers={buyers}
              onSelect={select}
              onUnsupported={setNotice}
            />
            {notice && (
              <div className="map-notice" role="status">
                {t("unmappedNotice", {
                  country: mapCountryName("", language, notice),
                })}
                <button
                  onClick={() => setNotice(undefined)}
                  aria-label={t("dismissNotice")}
                >
                  ×
                </button>
              </div>
            )}
            <div className="map-bottom">
              <div className="map-legend">
                <span>
                  <i className="legend-exporter" />
                  {t("exporter")}
                </span>
                <span>
                  <i className="legend-buyer" />
                  {t("topThree")}
                </span>
              </div>
              <span className="map-scale">{t("projection")}</span>
            </div>
            <div className="map-context">
              <span className="context-number">01 — 03</span>
              <p>
                {t("selectExporter")}
                <br />
                <span>{t("followConnections")}</span>
              </p>
              <span className="context-arrow" aria-hidden="true">
                ↗
              </span>
            </div>
          </section>
          <aside
            className="dashboard"
            aria-label={t("profileLabel")}
            aria-busy={loading}
          >
            <div className="dashboard-header">
              <div className="eyebrow">
                {t("exporterProfile")}{" "}
                <span className="country-iso">{selected.iso3}</span>
              </div>
              <div className="country-title">
                <h2>{countryName(country, language)}</h2>
                <label className="year-control">
                  <span className="sr-only">{t("yearLabel")}</span>
                  <select
                    value={year ?? ""}
                    disabled={!years.length}
                    onChange={(event) =>
                      setRequestedYear(Number(event.target.value))
                    }
                  >
                    {!years.length && <option value="">{t("year")}</option>}
                    {years.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <p>
                UN Comtrade <span>•</span> {t("annualExports")}
              </p>
            </div>
            {loading && (
              <div className="loading-state" role="status">
                <span className="loader" />
                <h3>{t("loadingTitle")}</h3>
                <p>
                  {t(
                    availability.isPending
                      ? "loadingAvailability"
                      : "loadingProfile",
                  )}
                </p>
                <small>{t("pacing")}</small>
                <div className="skeleton" />
                <div className="skeleton short" />
              </div>
            )}
            {error && (
              <div className="error-state" role="alert">
                <h3>{t("loadError")}</h3>
                <p>
                  {issueMessage(
                    error instanceof TradeError ? error.code : undefined,
                    language,
                  )}
                </p>
                <button
                  onClick={() => {
                    if (availability.isError) void availability.refetch();
                    else void profile.refetch();
                  }}
                >
                  {t("tryAgain")}
                </button>
              </div>
            )}
            {noData && (
              <div className="error-state">
                <h3>{t("noReportsTitle")}</h3>
                <p>{t("noReportsBody")}</p>
              </div>
            )}
            {!loading && !error && profile.data && (
              <TradeDashboard profile={profile.data} />
            )}
            {profile.data &&
              (profile.data.topBuyers.status === "unavailable" ||
                profile.data.topProducts.status === "unavailable") && (
                <button
                  className="retry-rankings"
                  disabled={profile.isFetching}
                  onClick={() => void profile.refetch()}
                >
                  {t("retryRankings")}
                </button>
              )}
          </aside>
        </div>
      </main>
      <footer id="about-data">
        <div>
          <Globe />
          <span>{t("tradeStory")}</span>
        </div>
        <p>
          {t("source")}:{" "}
          <a
            href="https://comtradeplus.un.org/"
            target="_blank"
            rel="noreferrer"
          >
            UN Comtrade ↗
          </a>{" "}
          · {t("currentUsdAnnual")}
          <br />
          {t("reportingNote")}
        </p>
        <a
          href="https://uncomtrade.org/docs/policy-on-comtrade-data-use/"
          target="_blank"
          rel="noreferrer"
        >
          {t("attribution")} ↗
        </a>
      </footer>
    </div>
  );
}
