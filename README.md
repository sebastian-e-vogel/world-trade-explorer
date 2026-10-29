# World Trade Explorer

An interactive world map for exploring countries. The map provides real geographic boundaries, hover feedback, country selection, a searchable selector, and a responsive dark interface.

The project is being published in stages. The UN Comtrade data layer is now available through a minimal serverless API. Dashboard presentation and localization follow in later milestones. The map interface still displays geographic context only; it does not display sample trade figures.

## Tech stack

React, strict TypeScript, Vite, react-simple-maps, and Vitest. The SVG map uses the Natural Earth projection and local World Atlas TopoJSON boundaries.

## Local development

Requires Node.js 22.12 or later and npm.

```sh
npm ci
npm run dev
```

```sh
npm test
npm run build
```

No API key or environment file is required. The proxy uses UN Comtrade public preview endpoints. Geography is bundled locally. Google Fonts is optional; system fonts provide a fallback.

## Map behavior

- Click a supported country to select it; hover to see its name.
- Search by country name, ISO alpha-2, or ISO alpha-3 code. The selector is also the keyboard-accessible alternative for countries that are small or missing from the simplified map.
- The selected country uses a distinct fill and boundary. Keyboard focus follows the country shape without a rectangular outline.
- Unsupported territories display an explanatory notice without changing the selected reporter.
- Geographic loading failures display an error while the country selector remains available.

## Country identifiers

The country reference table comes from UN Comtrade. Reporting territories are mapped to numeric ISO identifiers through reference data, rather than assuming their codes match. For example, Comtrade's United States code is 842 while the geographic boundary uses 840. The map excludes Antarctica and retains a presentation label of Islas Malvinas for territory 238, which is not a selectable reporter.

## Project structure

- `src/components/`: world map and country selector.
- `src/data/`: reporting-country reference table, identifier mapping, and tests.
- `public/countries-110m.json`: simplified world boundaries at a 1:110 million scale.
- `public/ATTRIBUTION.txt` and `THIRD_PARTY_NOTICES.md`: credits and licenses.

## Attribution

Geography: [World Atlas](https://github.com/topojson/world-atlas), derived from [Natural Earth](https://www.naturalearthdata.com/). Country references: [UN Comtrade](https://comtradeplus.un.org/), with ISO mapping derived from [i18n-iso-countries](https://github.com/michaelwittig/node-i18n-iso-countries). Borders provide geographic context and do not express a position on territorial disputes.

## UN Comtrade integration

The browser-facing endpoint is `/api/comtrade`. Its handler lives in `server/comtradeProxy.ts`; Vite mounts it during development, and `api/comtrade.ts` exposes it as a Vercel function. The proxy uses a fixed upstream host, accepts GET only, validates reporting countries and years, rejects unknown or duplicate parameters, and does not accept arbitrary URLs or headers. It allows server-to-server requests without relying on UN Comtrade's browser CORS permissions. Provider quotas still apply.

Supported queries:

```text
/api/comtrade?kind=availability&country=32
/api/comtrade?kind=total&country=32&year=2025
/api/comtrade?kind=products&country=32&year=2025
/api/comtrade?kind=buyers&country=32&year=2025
```

These examples use Argentina's reporter code and a specific annual period. Always obtain available years from the availability endpoint rather than assuming a country has data for that year.

The proxy queries `public/v1/getDA/C/A/HS` for annual availability and `public/v1/preview/C/A/HS` for exports. Totals use World as partner and `TOTAL` as commodity. Products use `AG2` for HS2 chapters; destinations omit the first partner filter while retaining `TOTAL`. All statistical queries fix exports, World as second partner, total customs procedures, and total transport modes.

The client and adapter remain independent of React. `primaryValue` is interpreted as USD trade value, and no missing value becomes zero. Rankings preserve leading zeros in HS codes and require a matching response count, fewer than 500 records, unique dimension keys, a consistent reported classification, and reconciliation with the World total. Invalid or incomplete rankings are marked unavailable while a validated total can remain usable. Buyers exclude World aggregates, groups, and non-geographic residual areas.

Upstream requests time out after 18 seconds and are paced within each warm function process. A short transient HTTP 429 may be retried once; an identified daily quota exhaustion is not retried. Errors use structured codes and are not cached. Successful responses permit 24-hour shared CDN caching. Pacing is not coordinated across Vercel instances, so higher traffic can still exhaust provider limits. Daily quota detection currently relies on the provider's error text.

## Tests

Automated tests use saved UN Comtrade responses for Argentina, Brazil, the United States, and South Sudan. They validate totals and rankings, incomplete responses, null values, duplicate rows, mixed dimensions, country-code differences, network errors, and quota behavior. Proxy tests mock the upstream service and verify validation, error statuses, caching, and bounded retries. No automated test contacts the live API.

## Vercel deployment

Use Node.js 22.x and import the repository as a Vite project. `vercel.json` configures the build output and API function. No environment variables are required for the current public API integration. A static-only preview cannot execute `/api/comtrade`; use `npm run dev` or `vercel dev` for local API requests. A future private subscription key must remain in server-side environment variables and must never use a `VITE_` prefix or appear in frontend URLs or bundles.

## Trade data usage

Statistics and country reference tables come from [UN Comtrade](https://comtradeplus.un.org/). Review its [data usage policy](https://uncomtrade.org/docs/policy-on-comtrade-data-use/), [redistribution policy](https://uncomtrade.org/docs/re-dissemination-of-data/), and [disclaimer](https://uncomtrade.org/docs/read-me-first-disclaimer/). Annual data may be provisional, revised, confidential, or unavailable. Products retain each country's reported HS revision; the application does not harmonize classifications across years. This project is a free visualization and does not provide bulk data exports.
