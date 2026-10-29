import { useEffect, useState } from "react";
import { useLanguage } from "../i18n/LanguageContext";
import { countryName, mapCountryName } from "../i18n/labels";
import { geoCentroid } from "d3-geo";
import {
  ComposableMap,
  Geographies,
  Geography,
  Graticule,
  Marker,
} from "react-simple-maps/core";
import type { Feature, GeoJsonObject, Geometry } from "geojson";
import type { GeometryCollection, Topology } from "topojson-specification";
import { countryForMapId, mapIdForM49 } from "../data/countryMapping";
import type { TradePartner } from "../domain/trade";

interface Props {
  selected: string;
  buyers: TradePartner[];
  onSelect: (code: string) => void;
  onUnsupported: (name: string) => void;
}

// Keep a stable parser so hover/selection changes do not reload the geographies.
const excludeAntarctica = (features: Feature<Geometry>[]) =>
  features.filter((feature) => Number(feature.id) !== 10);

export function WorldMap({ selected, buyers, onSelect, onUnsupported }: Props) {
  const { language, t } = useLanguage();
  const [world, setWorld] =
    useState<Topology<{ countries: GeometryCollection }>>();
  const [failed, setFailed] = useState(false);
  const [hover, setHover] = useState<{ id: string; fallback: string }>();

  useEffect(() => {
    const abort = new AbortController();
    // Fetch here to preserve cancellation and a visible error state. The library
    // handles TopoJSON conversion, projection and rendering after loading.
    void fetch("/countries-110m.json", { signal: abort.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Geography request failed");
        return response.json() as Promise<
          Topology<{ countries: GeometryCollection }>
        >;
      })
      .then((topology) => {
        if (topology.type !== "Topology" || !topology.objects?.countries) {
          throw new Error("Invalid geography asset");
        }
        setWorld(topology);
      })
      .catch(() => {
        if (!abort.signal.aborted) setFailed(true);
      });
    return () => abort.abort();
  }, []);

  const buyerIds = buyers.map((buyer) => mapIdForM49(buyer.countryCode));
  if (failed)
    return (
      <div className="map-fallback" role="alert">
        {t("mapLoadError")}
      </div>
    );
  if (!world)
    return (
      <div className="map-fallback" role="status">
        {t("mapLoading")}
      </div>
    );

  return (
    <div className="map-canvas">
      <ComposableMap
        width={1000}
        height={610}
        projection="geoNaturalEarth1"
        projectionConfig={{ scale: 172, center: [0, 10] }}
        aria-label={t("mapLabel")}
        role="group"
      >
        <defs>
          <radialGradient id="ocean">
            <stop offset="0" stopColor="#193338" stopOpacity=".45" />
            <stop offset="1" stopColor="#111a1e" stopOpacity="0" />
          </radialGradient>
        </defs>
        <ellipse cx="500" cy="305" rx="490" ry="265" fill="url(#ocean)" />
        <Graticule className="graticule" />
        <Geographies
          // v5 accepts TopoJSON at runtime, but its prop type only lists GeoJSON.
          geography={world as unknown as GeoJsonObject}
          parseGeographies={excludeAntarctica}
        >
          {({ geographies }) => (
            <>
              {geographies.map((geo) => {
                const id =
                  geo.id === undefined ? geo.rsmKey : String(Number(geo.id));
                const country = countryForMapId(id);
                const active = id === mapIdForM49(selected);
                const buyer = buyerIds.indexOf(id);
                const fallback = String(
                  geo.properties?.name ?? t("unmappedHover"),
                );
                const name = country
                  ? countryName(country.m49, language)
                  : mapCountryName(id, language, fallback);
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    className={`country ${active ? "selected" : buyer >= 0 ? "buyer buyer-" + buyer : ""} ${hover?.id === id ? "hovered" : ""} ${!country ? "unmapped" : ""}`}
                    role="button"
                    tabIndex={active ? 0 : -1}
                    aria-label={`${name}${active ? `, ${t("selectedSuffix")}` : buyer >= 0 ? `, ${t("buyerSuffix", { rank: buyer + 1 })}` : ""}`}
                    aria-pressed={active}
                    onMouseEnter={() => setHover({ id, fallback })}
                    onMouseLeave={() => setHover(undefined)}
                    onFocus={() => setHover({ id, fallback })}
                    onBlur={() => setHover(undefined)}
                    onClick={() =>
                      country ? onSelect(country.m49) : onUnsupported(fallback)
                    }
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        country
                          ? onSelect(country.m49)
                          : onUnsupported(fallback);
                      }
                    }}
                  >
                    <title>
                      {name}
                      {buyer >= 0
                        ? ` · ${t("buyerTitle", { rank: buyer + 1 })}`
                        : ""}
                    </title>
                  </Geography>
                );
              })}
              {geographies
                .filter(
                  (geo) =>
                    geo.id !== undefined &&
                    buyerIds.includes(String(Number(geo.id))),
                )
                .map((geo) => (
                  <Marker
                    key={`buyer-${geo.rsmKey}`}
                    coordinates={geoCentroid(geo)}
                    className="map-marker"
                    aria-hidden="true"
                  >
                    <circle r="12" />
                    <text textAnchor="middle" dy="4">
                      {buyerIds.indexOf(String(Number(geo.id))) + 1}
                    </text>
                  </Marker>
                ))}
            </>
          )}
        </Geographies>
      </ComposableMap>
      <div className="map-hover" aria-live="polite">
        {hover
          ? countryForMapId(hover.id)
            ? countryName(countryForMapId(hover.id)!.m49, language)
            : mapCountryName(hover.id, language, hover.fallback)
          : t("hoverHint")}
      </div>
    </div>
  );
}
