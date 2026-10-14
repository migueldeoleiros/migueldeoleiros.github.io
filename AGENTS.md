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
  - components: `src/components/Hero.astro`, `src/components/About.astro`, `src/components/GardenCard.astro`, `src/components/ThemeToggle.astro`
  - content/config: `src/data/site.ts`
  - global styles: `src/styles/global.css`
  - client init: `src/scripts/index.ts`

## Interaction Contracts (Do Not Break)

- Particle hero contract spans `Hero.astro`, `global.css`, `src/scripts/particleText.ts`, and `particleMotion` in `src/data/site.ts`:
  - `.hero-particles` supplies `data-particle-text` and `data-particle-alt-text`; retain `[data-particle-canvas]` and the accessible `[data-particle-title]` fallback.
  - Hero clicks toggle particle title text, except clicks on links/buttons; pointer interaction supports mouse and touch without blocking vertical scrolling.
  - Garden tree morph samples the actual `.garden-base svg` paths. Keep that base DOM; `data-particle-morph` is an internal enablement flag, gated by valid samples, hover capability, and no reduced motion.
  - Reduced motion renders static particles and disables garden morphing. Preserve palette updates and resize/font rebuilding.
- Garden color inversion is regular CSS on `.garden-base` and its icon card: `:focus-visible` always works, hover is gated by `(hover: hover)`, and reduced motion disables color transitions. Keep no-JS behavior and the focus ring; no duplicate reveal layer is needed.
- Theme toggle stays icon-only and must keep updating `aria-label`, `title`, and `aria-pressed` (`src/scripts/themeToggle.ts`).
- Head bootstrap script in `BaseLayout` sets `js` class and restores stored theme before paint; keep it inline.

## Files / Outputs

- Do not edit build artifacts in `dist/`.
- `.astro/` is generated and excluded from source edits.

## Current Quality Gate

- There are no test/lint/typecheck npm scripts.
- Minimum safe verification after UI/interaction changes:
  1. Targeted Prettier check for changed source/docs (Astro plugin is configured), then `pnpm build`.
  2. Manual check in dev for particle entrance/pointer response, hero title toggle (links remain navigable), garden tree morph on hover/focus, and return to the selected title.
  3. Check garden color inversion/focus ring with no JS, reduced motion (no transitions), and touch (no sticky hover); check static reduced-motion particles and theme toggle label/title updates.
