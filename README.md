# Linga

A language-training practice app (Georgian, with Russian prompts).

This is a lightweight npm-workspaces monorepo. The app lives in [`apps/app`](./apps/app).

## Quick start

```bash
npm install
npm run dev        # start the app dev server (Vite)
```

Other scripts (run from the repo root, forwarded to the app workspace):

```bash
npm run build      # typecheck + production build -> apps/app/dist
npm run preview    # serve the production build locally
npm run typecheck  # tsc --noEmit
```

## Architecture

See [`apps/app/README.md`](./apps/app/README.md) for the app architecture — the
challenge-type **registry** that makes adding new exercise types a localized change,
the routing model, and the JSON "database".

## Deployment (Vercel)

The app is a static Vite SPA. On Vercel, create a project from this repo and set:

- **Root Directory:** `apps/app` (Vercel then auto-detects the Vite preset, `vite build`, output `dist`).

`apps/app/vercel.json` adds the SPA fallback rewrite so client-side deep links
(e.g. `/units/basics-1/challenge/2`) resolve on hard refresh instead of 404ing.
