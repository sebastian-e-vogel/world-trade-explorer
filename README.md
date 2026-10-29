# World Trade Explorer

An interactive world map for exploring countries. This milestone adds real geographic boundaries, hover feedback, country selection, a searchable selector, and a responsive dark interface.

The project is being published in stages. Trade statistics, export rankings, reporting periods, and localization will be added in later milestones. This version does not display sample trade figures.

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

No API key or environment file is required for this milestone. Geography is bundled locally. Google Fonts is optional; system fonts provide a fallback.

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
