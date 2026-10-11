# ADR 0001: Vite + React + react-i18next for the Portfolio Site

Date: 2026-10-11

## Context

The portfolio site needs Chinese/English one-click switching, a dark tech aesthetic, four project showcases with video placeholders, and local `npm run dev` preview. Deployment to GitHub Pages is done by the site owner later; the build must work under both `username.github.io` and `username.github.io/<repo>/` URLs.

## Decision

Build with **Vite + React + react-i18next**, styled with **hand-written CSS** (no UI framework, no Tailwind). All copy lives in `src/locales/zh.json` / `en.json`. Vite `base` is set to `'./'` (relative paths) so the same `dist/` output works under any Pages URL.

## Alternatives considered

- **Pure hand-written static HTML/CSS/JS**: zero build, simplest deploy. Rejected: maintaining two languages in static HTML means duplicating every page's markup, and the owner explicitly chose the React route.
- **Next.js**: stronger SSR/SEO. Rejected: overkill for a single scrolling page; static export adds config surface the owner never asked for.
- **Tailwind CDN**: faster utility styling. Rejected: owner chose hand-written CSS with the Vite/React build; a single `styles.css` keeps the dark theme in one reviewable place.

## Consequences

- `npm install` + `npm run dev` required for local preview (Node 20+).
- Every user-visible string must go through `t()` and both locale files; see README's TODO list for the placeholder convention (`TODO:` prefix).
- `dist/` is git-ignored; Pages deploy is the owner's manual step, unaffected by this decision thanks to relative `base`.
