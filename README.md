# World Trade Explorer

An interactive web application for exploring annual merchandise exports. Select a country on the map or through the searchable selector to see its total exports, three leading HS2 product categories, and three main export destinations. The dashboard displays USD values, shares, reference year, and source, while the map highlights the selected exporter and its buyers.

The interface supports English and Spanish. All trade statistics are retrieved on demand from **UN Comtrade**. The application does not use fabricated statistics or maintain its own trade database.

## Tech stack

React, strict TypeScript, Vite, TanStack Query, i18next, react-simple-maps, d3-geo, and Vitest. The map uses local geographic boundaries from World Atlas/Natural Earth. No database, user accounts, or scheduled data ingestion are required.

## Local development

Requires Node.js 22.12 or later within the 22.x series and npm.

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite, normally `http://127.0.0.1:5173/`. To run the automated tests and create a production build:

```sh
npm test
npm run build
```

The current public API integration requires no `.env` file or API key. `npm run preview` serves static build assets only; use `npm run dev` or `vercel dev` to exercise the API route locally.

## Data integration

The browser calls `/api/comtrade`. A small server function validates the parameters and queries UN Comtrade's public endpoints. Vercel exposes this function through `api/comtrade.ts`; Vite mounts the same handler during local development. The proxy makes the API accessible to the application without depending on the provider's browser CORS permissions. It remains subject to UN Comtrade's quotas and response limits.

A first country selection requests annual reporting availability, total exports, HS2 product categories, and export destinations. TanStack Query deduplicates requests and keeps responses fresh for 24 hours in browser memory, with a seven-day garbage collection period. Successful proxy responses permit 24-hour shared CDN caching.

The adapter checks response completeness and consistency before displaying rankings. It rejects capped responses, inconsistent counts, duplicate rows, mixed HS levels or classifications, and values that do not reconcile with the World total. An unavailable ranking is identified explicitly while a valid total can remain visible. Missing data is never silently converted to zero.

## Data limitations

- The public preview endpoint returns at most 500 records per response. Potentially truncated responses are rejected rather than presented as complete rankings.
- Reporting years come from each country's annual availability catalog. The latest available year is selected by default; monthly records are not substituted for annual data.
- USD trade values use Comtrade's `primaryValue` field. Shares use the reporting country's total World exports as their denominator.
- Products use HS2 chapters from the country's reported HS revision, displayed alongside the results. The application does not harmonize classifications across years.
- Destinations represent countries or areas, not individual companies. World aggregates, groups, and non-geographic residual areas are excluded from buyer rankings.
- Statistics may be provisional, revised, confidential, or unavailable for a particular country and year. Geographic boundaries and Comtrade reporting territories do not always match; the selector supports countries that are too small or absent from the map.
- Provider rate limits still apply. Requests are paced within each warm function instance, with limited retries for temporary failures. This is not a distributed quota management system, and larger audiences may exhaust the public service's limits.

A future private API key must be stored only in Vercel's server environment and sent upstream from the server. It must never use a `VITE_` prefix, appear in a frontend URL, or be returned to the browser. The current application does not read a private key.

## Deploy to Vercel

1. Push the completed project to GitHub and import the repository in Vercel.
2. Select the Vite preset with the repository root (`./`), install command `npm ci`, build command `npm run build`, and output directory `dist`. The Node.js runtime is pinned to `22.x` in `package.json`; `vercel.json` configures the API function.
3. No environment variables are needed for the current public API integration.
4. Use `main` as the production branch. After deployment, check `/api/comtrade?kind=availability&country=32`, then verify country selection, year selection, and language switching. Future merges into `main` trigger production deployments through the GitHub integration.

A static-only deployment does not include `/api/comtrade`; the deployment must execute the Vercel function.

## Project structure

- `src/domain/`: provider-independent models and ranking calculations.
- `src/data/`: API client, response adaptation, reference tables, and country mapping.
- `src/hooks/`: TanStack Query orchestration and caching.
- `src/components/`: map, country selector, and trade dashboard.
- `src/i18n/`: English and Spanish translations.
- `public/`: geographic boundaries and attribution.
- `api/` and `server/`: Vercel entry point and proxy shared with local development.
- `tests/` and colocated test files: automated tests using saved fixtures without live Comtrade calls.

## Attribution and data usage

Trade statistics come from [UN Comtrade](https://comtradeplus.un.org/). Refer to the [data usage policy](https://uncomtrade.org/docs/policy-on-comtrade-data-use/), [redistribution policy](https://uncomtrade.org/docs/re-dissemination-of-data/), and [disclaimer](https://uncomtrade.org/docs/read-me-first-disclaimer/). This application is a free visualization without bulk data exports. Review the provider's terms if its usage or redistribution scope changes.

Geographic boundaries come from [World Atlas](https://github.com/topojson/world-atlas), derived from [Natural Earth](https://www.naturalearthdata.com/). Credits and license information are retained in [`public/ATTRIBUTION.txt`](public/ATTRIBUTION.txt) and [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md). Map boundaries provide geographic context and do not express a position on territorial disputes.

## Localization

The interface uses i18next and react-i18next with local resources in `src/i18n/locales/`. Spanish is the initial language, and the selected language is saved in the browser. Switching languages does not request trade statistics again. Country names, numeric values, percentages, and dates follow the active locale. Spanish HS2 descriptions are display summaries; original source codes, classifications, and values remain unchanged.

The map and destination lists display “Islas Malvinas” in both languages. This presentation override preserves the original UN Comtrade and ISO identifiers and does not add a selectable reporter.
