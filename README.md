# Warframe Nexus

A bilingual Warframe utility hub for live worldstate, arbitration schedules, local Riven screenshot analysis, and the small details that are easy to miss between resets.

[![Deploy Pages](https://github.com/zjm960929/warframe-nexus/actions/workflows/pages.yml/badge.svg)](https://github.com/zjm960929/warframe-nexus/actions/workflows/pages.yml)
[![Node](https://img.shields.io/badge/node-%3E%3D22.18-339933)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

English | [中文](README.zh.md)

## Contents

- [Features](#features)
- [Requirements](#requirements)
- [Installation](#installation)
- [Usage](#usage)
- [How it works](#how-it-works)
- [Security and limitations](#security-and-limitations)
- [Development](#development)
- [Release](#release)
- [Contributing](#contributing)
- [License](#license)

## Features

- **Minimal home page**: centered title, social links, and square tool cards; filtering keeps the title, search box, card size, and layout fixed while matching results stay centered.
- **Worldstate**: seven world time displays, daily and weekly reset countdowns, Darvo's Deal, Nightwave, arbitration, alerts, invasions, current events, Sortie, Archon Hunt, The Circuit (normal Warframes and Steel Path Incarnon weapons), the Steel Path weekly shop and daily incursions, Deep and Temporal Archimedea, and three fissure modules.
- **Arbitration schedule**: current and next arbitration, a local-time grouped schedule, 1/3/7/30/90-day views, mission-type and enemy-faction filters, and inline type/faction badges.
- **Riven calculator**: normal and September spliced stat ranges by weapon type, Riven Mod rank, and stat count, with the fixed 1.20x disposition; the analysis follows the actual selected positive and negative stats. Upload or paste a Riven screenshot for local Tesseract OCR, then edit the detected weapon, attributes, and values before analysis. OCR needs an HTTP-served page because Tesseract uses Worker/WASM assets; use `npm start` or the deployed site rather than opening `test.html` via `file://`. The analysis mode also shows the matching stat tables below, while the separate **Query attribute values** view can inspect any rank and attribute setup without changing the analysis.
- **Readable fissures**: normal fissures, Steel Path fissures, and Void Storms are sorted by era: Lith, Meso, Neo, Axi, Requiem, Omnia.
- **Bilingual UI**: Chinese and English with saved language preference; light, dark, and system themes.
- **Custom layout**: drag modules in the layout editor or directly on the page while editing, with live placement previews and animated reflow; mouse drags use native drag and touch drags use Pointer Events. Hidden-module actions, per-module visibility, completed-module temporary hiding, automatic restoration after content refresh, and show-completed/show-all/reset controls are saved in the browser. Each module also has a width menu (auto, 1/3, 1/2, 2/3, or full).
- **Wide-screen masonry**: a responsive 12-column layout that fills gaps instead of leaving holes under short modules.

## Requirements

- **Node.js 22.18 or newer** for the local server, builds, and tests.
- A modern browser with ES modules and `localStorage`.
- No Warframe account, API key, or third-party worldstate service is required.

## Installation

### Live site

Open <https://zjm960929.github.io/warframe-nexus/>.

The hosted site can use a permitted Render API for live official data. When that API is unavailable, it falls back to the latest static snapshot generated during the Pages build.

### Self-contained file

Open the repository's `test.html` directly in a browser.

- The file is approximately 2.4 MiB and contains CSS, application code, both UI languages, the official term dictionary, a worldstate snapshot, the static arbitration table, the Steel Path incursion schedule, and the Riven weapon index.
- It makes no network requests and uses the build-time snapshot rather than live data.
- This is the simplest way to inspect the layout without installing Node.js.

### Local Node server

```bash
npm ci
npm start
```

Open <http://127.0.0.1:4173>. The server reads the official Digital Extremes feed on demand and caches parsed data for 30 seconds.

Useful environment variables:

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `4173` | HTTP port |
| `HOST` | `127.0.0.1` | Listen address; use `0.0.0.0` for a hosted service |
| `HTTPS_PROXY` / `HTTP_PROXY` | empty | Proxy for the official feed request |
| `NODE_USE_ENV_PROXY` | empty | Set to `1` to let Node use the proxy variables |

Example with a local proxy:

```powershell
$env:HTTPS_PROXY = 'http://127.0.0.1:7897'
$env:NODE_USE_ENV_PROXY = '1'
npm start
```

Development mode:

```bash
npm run dev
```

### Render

The repository includes [`render.yaml`](render.yaml) for a Render Web Service that runs the existing Node server. The current deployment is the manually created Singapore service at `https://warframe-nexus-zjm.onrender.com`.

1. Create a Render account and connect the repository.
2. Create a Web Service manually with:
   - Region: Singapore
   - Build command: `npm ci`
   - Start command: `npm start`
   - Health check path: `/api/health`
   - Environment variable: `HOST=0.0.0.0`
   - Environment variable: `NODE_VERSION=22`
3. Deploy and test `/api/health` and `/api/worldstate?lang=zh`.

Render's free Web Service sleeps after about 15 minutes of inactivity and may take about a minute to start again. The paid always-on compute plan is `0.5c-512mb` (formerly called `starter`), approximately $7/month. The optional Blueprint in `render.yaml` uses the Singapore region and that plan ID.

To let GitHub Pages use the Render service, set the repository variable `WF_NEXUS_API_BASE` to the Render service root URL and rerun the Pages workflow.

### GitHub Pages

```bash
npm ci
npm test
npm run build:pages
npm run build:standalone
```

`build:pages` writes the static site to `docs/`. `build:standalone` writes the self-contained `test.html`.

If the official feed is unavailable during a Pages build, the build reuses the committed `worldstate.json` snapshot and continues.

The optional repository variable `WF_NEXUS_API_BASE` configures the external API used by the hosted frontend. The variable should be the service root URL, without `/api/worldstate`. When it is absent, Pages uses static snapshots only.

## Usage

- Use the top navigation for **Home**, **Worldstate**, **Arbitration Schedule**, and **Riven Calculator**.
- The home search filters square tool cards by name, description, and keywords; press `/` to focus it. Filtering keeps the centered hero and card sizes fixed.
- Use the language and theme switches in the header. Preferences are stored locally.
- On the **Riven Calculator**, upload, drop, or paste a screenshot; local OCR fills the weapon, stats, and values. The analysis uses the actual selected positive and negative stats, and the separate **Query attribute values** view can inspect other rank/stat combinations without changing the analysis.
- On **Worldstate**, use **Customize layout** to drag modules into a new order. Other modules animate out of the way while you hold the drag; modules on the page can be dragged directly while the editor is open. Use the width menu to resize each module, or press Alt + ↑/↓ with focus. Dragging near the top or bottom edge scrolls the page gradually. Countdowns update each minute, data refreshes every five minutes, and **Refresh data** requests a fresh response.
- The Circuit shows this week's three normal Warframes and five Steel Path Incarnon weapons, with full rotation dialogs; the Steel Path module shows the eight-item weekly shop rotation and six daily incursions.
- Fissure modules are ordered by era, then by remaining time within the same era.
- On **Arbitration Schedule**, change the date range and filter by mission type or enemy faction; mission type and faction badges stay inline with the node.

## How it works

```text
api.warframe.com/cdn/worldState.php
              │
              ├── local Node server ──► /api/worldstate ──► browser
              │
              └── Render Web Service ──► /api/worldstate ──► GitHub Pages
```

- The official feed is parsed with [`warframe-worldstate-parser`](https://github.com/WFCD/warframe-worldstate-parser). During parsing, `src/official.mjs` blocks every non-official request, so optional community bounty enrichment is never used.
- The browser never calls the official endpoint directly because it does not send CORS headers.
- GitHub Pages is static, so it reads `docs/data/worldstate.json` unless an external API is configured.
- The arbitration timetable is a bundled hourly CSV plus generated display metadata; it is not a third-party API.
- The `/api/worldstate` endpoint supports CORS and a `fresh=1` query parameter for an explicit refresh.

## Security and limitations

- **Official data only**: the worldstate comes from Digital Extremes' public feed. No third-party worldstate API is used.
- **No account access**: the project does not ask for a Warframe account, password, token, or game installation.
- **Cloud egress may be blocked**: GitHub-hosted runners and some cloud providers receive HTTP 403 from the official endpoint. A deployment must test `/api/worldstate` before it is used by Pages.
- **Render free tier sleeps**: the first request after inactivity can be slow; the frontend falls back to a static snapshot and shows a “server is starting” hint next to Refresh data.
- **Static snapshots age**: the self-contained file and Pages fallback are build-time snapshots, not live data.
- **Arbitration data is static**: the hourly rotation table is bundled and can become outdated if the schedule changes.
- **Steel Path incursions are bundled static data**: the six daily missions come from a generated local schedule, not a third-party API.
- **No warranty**: this is an unofficial fan project and is not affiliated with Digital Extremes.

## Development

### Repository structure

```text
warframe-nexus/
  test.html                  Self-contained build
  server.mjs                 Static server + official worldstate proxy
  render.yaml                Render Web Service blueprint
  src/official.mjs           Official fetch, parse, and request guard
  public/
    index.html
    assets/css/styles.css
    js/
      app.js                 Startup, routing, theme, language, refresh
      normalize.js           Pure worldstate normalization
      localize.js            Official term localization
      i18n.js                UI copy and date/countdown formatting
      riven-weapons.js       Official Riven weapon index
      steel-path-incursions.js  Bundled Steel Path incursion schedule
      pages/                 Home, worldstate, arbitration, riven, placeholder
    locales/                 en.json and zh-CN.json
    data/                    Terms, arbitration tables, and rotation metadata
  scripts/
    build-pages.mjs          Static Pages build
    build-standalone.mjs     Self-contained build
    build-arbitration-nodes.mjs
    build-terms.mjs
  docs/                      GitHub Pages output
  test/                      Node test suite
```

### Checks and tests

```bash
npm ci
npm test
```

The Node test suite covers normalization, arbitration selection, localization, bilingual copy consistency, term mappings, fissure ordering, Riven scanning, and Riven calculations.

### Local build smoke test

```bash
npm run build:pages
npm run build:standalone
```

Then open `docs/index.html` through a static server, or open the generated root `test.html` directly.

## Release

The current release is **v0.7.3**.

1. Run `npm test`.
2. Build `docs/` and `test.html`.
3. Commit the source and generated artifacts.
4. Create an annotated tag matching `package.json`.
5. Push `main` and the tag.
6. Confirm the GitHub Pages workflow completed successfully.

## Contributing

Issues and pull requests are welcome. Keep changes focused, include tests for behavior changes, and keep user-facing strings in both `public/locales/en.json` and `public/locales/zh-CN.json`.

- Project: <https://github.com/zjm960929/warframe-nexus>
- Email: <zjm960929@outlook.com>

## License

Project code is licensed under the [MIT License](LICENSE). Third-party dependencies are listed in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). Warframe names, data, and assets belong to Digital Extremes.
