# AGENTS

## Repo Reality Check
- This is a single Astro app (no workspace/monorepo).
- `README.md` is starter boilerplate; trust `package.json` and `src/` as source of truth.

## Required Runtime / Tooling
- Node version must satisfy `>=22.12.0` (`package.json` engines).
- Primary package manager is pnpm (`pnpm-lock.yaml`), but npm scripts also work.

## Canonical Commands
- Install deps: `pnpm install`
- Dev server: `pnpm dev`
- Production build (primary verification step): `pnpm build` (or `npm run build`)
- Preview static output: `pnpm preview`
- Astro CLI passthrough: `pnpm astro ...`

## Real Entrypoints / Boundaries
- Route entrypoint is `src/pages/index.astro`, but it composes:
  - layout: `src/layouts/BaseLayout.astro`
  - components: `src/components/Hero.astro`, `src/components/About.astro`, `src/components/ThemeToggle.astro`
  - content/config: `src/data/site.ts`
  - global styles: `src/styles/global.css`
  - client init: `src/scripts/index.ts`

## Interaction Contracts (Do Not Break)
- Hero reveal contract spans markup + CSS + JS:
  - markup expects `.hero-surface` with `data-interactive` and `data-hover` plus `.hero-invert`
  - CSS reveal uses both `clip-path` and `-webkit-clip-path`
  - JS (`src/scripts/heroReveal.ts`) drives `--mx`, `--my`, `--radius` and toggles hover/interactivity flags
- Coarse pointers intentionally disable hero hover effect (implemented in both CSS and JS).
- Theme toggle stays icon-only and must keep updating `aria-label`, `title`, and `aria-pressed` (`src/scripts/themeToggle.ts`).
- Head bootstrap script in `BaseLayout` sets `js` class and restores stored theme before paint; keep it inline.

## Files / Outputs
- Do not edit build artifacts in `dist/`.
- `.astro/` is generated and excluded from source edits.

## Current Quality Gate
- There are no test/lint/typecheck npm scripts.
- Minimum safe verification after UI/interaction changes:
  1. `pnpm build`
  2. quick manual check in dev for hero hover (mouse), no-hover on coarse pointer, and theme toggle label/title updates.
