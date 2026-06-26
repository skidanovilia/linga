# @linga/app

Georgian language practice app — Vite + React + TypeScript + React Router + Tailwind CSS.

## Scripts

```bash
npm run dev        # Vite dev server
npm run build      # tsc -b && vite build  ->  dist/
npm run preview    # serve the production build
npm run typecheck  # tsc -b
```

## Architecture

### Domain (`src/types/domain.ts`)
A `Unit` has a `title` and a list of `Challenge`s. `Challenge` is a **discriminated
union** keyed on `type` (`fill_choice` | `order` | `fill_type`), so each member's
`data` shape is narrowed. Units carry a stable authored `id` (used in URLs);
challenges are addressed by array index.

### Data (`src/data/`)
`units.json` is the bundled stand-in "database". Every read goes through
`db.ts` (`getUnits` / `getUnit` / `getChallenge`) and is surfaced to routes via
React Router **loaders** — so swapping in a real API later is a localized change
(make the `db.ts` functions `async` + `await` in the loaders).

### Routing (`src/router.tsx`)
```
/                              → redirect to /units
/units                         → UnitsListPage
/units/:unitId                 → UnitSessionLayout (loads unit, owns session score)
  index                        → redirect to challenge/0
  challenge/:index             → ChallengePage
  result                       → ResultPage
*                              → NotFound
```
The unit layout stays mounted across challenges, accumulating the score in memory
(`src/session/`), exposed to child routes via `<Outlet context>` / `useSession()`.

### Challenge types — the extensible core (`src/challenges/`)
Each type lives in its own folder (`FillChoice/`, `Order/`, `FillType/`) with a
component, a pure `check.ts`, and a `ChallengeDef`. `registry.ts` maps
`type → ChallengeDef` with an **exhaustive mapped type**. `ChallengeRenderer`
dispatches on `challenge.type`, owns the answer/status state, and renders the
universal Check → feedback → Next flow (`components/CheckBar`).

**To add a new challenge type:**
1. Add its `*Data` interface + union member in `types/domain.ts`.
2. Add `challenges/<NewType>/` (component + `check.ts` + a `ChallengeDef` export).
3. Add one line to `challenges/registry.ts` (the mapped type makes this mandatory).

No changes to the renderer, the Check bar, routing, or scoring.

## Deployment (Vercel)
Static SPA. Set the project's **Root Directory** to `apps/app` (Vercel auto-detects
the Vite preset). `vercel.json` adds the SPA fallback rewrite so client-side deep
links resolve on hard refresh.
