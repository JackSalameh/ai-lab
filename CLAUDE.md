# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- Local preview: `npm run preview` (runs `server.js`, serves at `http://localhost:8080`; uses only Node's built-in `http`/`fs` modules, nothing to install)
- Tests: `npm test` (runs `node --test`; no test files exist yet, so it currently reports 0 tests)
- Run a single test file once tests exist: `node --test path/to/file.test.js`

## Architecture

Static site (HTML/CSS/vanilla JS, ES modules, no build step, no npm dependencies) meant to be published on GitHub Pages, which serves static files only — there is no backend, database, or shared storage across visitors.

- `src/logic.js` — pure functions only (`validateUseCase`, `calculateTotalHours`). No DOM or storage access, by design, so this file is what future tests should target.
- `src/app.js` — all browser-side state handling: seeds data, renders the table/total, handles the add-use-case form, handles JSON export. Imports from `logic.js`.
- `data/use-cases.json` — seed data (5 fictional use cases; no real org data, since the repo is public).
- `server.js` — local-preview-only static file server. Not used by GitHub Pages; exists because opening `index.html` via `file://` breaks the `fetch()` call that loads the seed JSON.

### Data flow (non-obvious, spans `app.js` + localStorage)

`app.js` seeds `localStorage` (key `aiUseCases`) from `data/use-cases.json` **only when `localStorage` is empty** (i.e. on a given browser's first visit). After that, all reads and writes go to `localStorage` only — `data/use-cases.json` is never read again and never written back to. Consequences to keep in mind when changing this code:

- Editing `data/use-cases.json` has no effect on a browser that has already seeded its `localStorage`; only a visitor with empty `localStorage` (first-time, different browser/device, or cleared site data) picks up changes.
- There is no cross-visitor sync — each browser's data is independent, and "Export JSON" (downloads current `localStorage` state) is the only way to get data out.

### Current scope

v1 is add-only (via the form on `index.html`). Editing or deleting existing rows is intentionally not implemented yet.
