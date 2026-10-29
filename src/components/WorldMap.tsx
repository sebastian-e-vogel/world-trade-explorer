import { useEffect, useState } from "react";
import { ComposableMap, Geographies, Geography, Graticule } from "react-simple-maps/core";
import type { Feature, GeoJsonObject, Geometry } from "geojson";
import type { GeometryCollection, Topology } from "topojson-specification";
import { countryForMapId, mapIdForM49 } from "../data/countryMapping";

interface Props {
  selected: string;
  onSelect: (code: string) => void;
  onUnsupported: (name: string) => void;
}

// Keep a stable parser so selection changes do not reload the geography.
const excludeAntarctica = (features: Feature<Geometry>[]) =>
  features.filter((feature) => Number(feature.id) !== 10);
const mapName = (id: string, fallback: string) =>
  Number(id) === 238 || /falkland|malvinas/i.test(fallback)
    ? "Islas Malvinas"
    : countryForMapId(id)?.name ?? fallback;

export function WorldMap({ selected, onSelect, onUnsupported }: Props) {
  const [world, setWorld] = useState<Topology<{ countries: GeometryCollection }>>();
  const [failed, setFailed] = useState(false);
  const [hover, setHover] = useState<string>();
  useEffect(() => {
    const abort = new AbortController();
    void fetch("/countries-110m.json", { signal: abort.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Geography request failed");
        return response.json() as Promise<Topology<{ countries: GeometryCollection }>>;
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

  if (failed) return <div className="map-fallback" role="alert">The world boundaries could not load. You can still choose a country using the search field.</div>;
  if (!world) return <div className="map-fallback" role="status">Loading world boundaries…</div>;
  return (
    <div className="map-canvas">
      <ComposableMap width={1000} height={610} projection="geoNaturalEarth1"
        projectionConfig={{ scale: 172, center: [0, 10] }}
        aria-label="World map. Select a country, or use the country selector above." role="group">
        <Graticule className="graticule" />
        <Geographies
          // v5 accepts TopoJSON at runtime, but its prop type only lists GeoJSON.
          geography={world as unknown as GeoJsonObject} parseGeographies={excludeAntarctica}>
          {({ geographies }) => geographies.map((geo) => {
            const id = geo.id === undefined ? geo.rsmKey : String(Number(geo.id));
            const country = countryForMapId(id);
            const active = id === mapIdForM49(selected);
            const name = mapName(id, String(geo.properties?.name ?? "Unmapped territory"));
            const choose = () => country ? onSelect(country.m49) : onUnsupported(name);
            return <Geography key={geo.rsmKey} geography={geo}
              className={`country ${active ? "selected" : ""} ${!country ? "unmapped" : ""}`}
              role="button" tabIndex={active ? 0 : -1} aria-label={`${name}${active ? ", selected" : ""}`}
              aria-pressed={active} onMouseEnter={() => setHover(name)}
              onMouseLeave={() => setHover(undefined)} onFocus={() => setHover(name)}
              onBlur={() => setHover(undefined)} onClick={choose}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  choose();
                }
              }}><title>{name}</title></Geography>;
          })}
        </Geographies>
      </ComposableMap>
      <p className="map-hover" aria-live="polite">{hover ?? "Hover to discover · Click to select"}</p>
    </div>
  );
}
