import { useState } from "react";
import { WorldMap } from "./components/WorldMap";
import { CountrySelector } from "./components/CountrySelector";
import { countryForM49 } from "./data/countryMapping";

export function App() {
  const [selected, setSelected] = useState("32");
  const [notice, setNotice] = useState<string>();
  const country = countryForM49(selected)!;
  const select = (code: string) => { setSelected(code); setNotice(undefined); };
  return <div className="app-shell">
    <header className="app-header"><a href="/">WORLD TRADE <span>EXPLORER</span></a><span className="header-note">EXPLORE THE WORLD</span></header>
    <main>
      <section className="intro"><p className="eyebrow">THE GLOBAL ECONOMY, CONNECTED</p><h1>A world of <span>connections.</span></h1><p>Discover countries and explore their geographic context.</p></section>
      <CountrySelector selected={country.name} onSelect={select} />
      <div className="explorer-grid">
        <section className="map-panel" aria-label="Interactive world map">
          <div className="panel-heading"><span>WORLD MAP</span><span>NATURAL EARTH PROJECTION</span></div>
          <WorldMap selected={selected} onSelect={select} onUnsupported={(name) => setNotice(`${name} has no supported reporting-country mapping. Choose another country using the search field.`)} />
          <div className="legend"><i /> Selected country</div>
          {notice && <div className="territory-notice" role="status"><span>{notice}</span><button aria-label="Dismiss territory notice" onClick={() => setNotice(undefined)}>×</button></div>}
        </section>
        <aside className="country-panel" aria-label="Selected country">
          <p className="eyebrow">SELECTED COUNTRY</p><h2>{country.name}</h2>
          <dl><div><dt>ISO code</dt><dd>{country.iso3}</dd></div><div><dt>Comtrade reporter code</dt><dd>{country.m49}</dd></div></dl>
          <p className="selection-hint">Click a country on the map or use the search field to change your selection.</p>
        </aside>
      </div>
    </main>
    <footer>Boundaries: World Atlas / Natural Earth · <a href="/ATTRIBUTION.txt">Data & attribution ↗</a></footer>
  </div>;
}
