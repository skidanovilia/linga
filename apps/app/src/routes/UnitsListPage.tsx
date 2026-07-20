import { useState } from 'react'
import { useLoaderData } from 'react-router'
import type { Unit } from '../types/domain'
import { useAuth } from '../auth/useAuth'
import { useShelfStatus } from '../srs/useShelfStatus'
import { useChallengeRuns } from '../challenges/run/useChallengeRuns'
import { PageShell } from '../components/PageShell'
import { ButtonLink } from '../components/Button'
import { UnitCard, type CardAccent } from './UnitCard'

// Rotate the three primaries across the unit cards for the constructivist rhythm.
const ACCENTS: CardAccent[] = ['red', 'blue', 'yellow']

type TabKey = 'new' | 'today' | 'recently'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'new', label: 'New' },
  { key: 'today', label: 'Today' },
  { key: 'recently', label: 'Recently' },
]

/**
 * Explore: the same unit cards regrouped into three non-exclusive slices of the
 * one unit list, each a horizontal scroll row. The tabs differ only by which
 * units are visible — the card itself is unchanged (see `UnitCard`):
 *  - New       — units with no permanent `unit_completion` badge.
 *  - Today     — units with something to review now: due or brand-new vocab
 *                (exactly the shelf's `enabled` predicate).
 *  - Recently  — units with vocab progress but nothing due/new now (all due > now).
 */
export function UnitsListPage() {
  const units = useLoaderData() as Unit[]
  const { user } = useAuth()
  const shelves = useShelfStatus(units)
  const runs = useChallengeRuns()
  const [tab, setTab] = useState<TabKey>('new')

  // Accent keyed on the unit's position in the full list, so a unit keeps the
  // same color whichever tab it appears in.
  const cards = units.map((unit, i) => ({ unit, accent: ACCENTS[i % ACCENTS.length] }))

  const inTab = (unit: Unit): boolean => {
    const shelf = shelves?.get(unit.id)
    if (tab === 'new') return !runs.hasUnitCompletion(unit)
    if (tab === 'today') return shelf?.enabled === true
    // recently: has vocab progress scheduled ahead, but nothing due/new right now.
    return shelf != null && !shelf.enabled && shelf.nextDueAt != null
  }

  const visible = cards.filter(({ unit }) => inTab(unit))

  return (
    <PageShell className="gap-6 py-10">
      <h1 className="font-display text-4xl font-black uppercase leading-none tracking-tighter md:text-6xl">
        Explore your lessons
      </h1>

      <div role="tablist" aria-label="Lesson groups" className="flex flex-wrap gap-2">
        {TABS.map(({ key, label }) => {
          const active = key === tab
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(key)}
              className={
                'rounded-none border-2 border-ink px-4 py-2 font-display text-sm font-bold uppercase ' +
                'tracking-tight shadow-hard transition-transform duration-200 ease-out md:border-4 md:shadow-hard-lg ' +
                'active:translate-x-[2px] active:translate-y-[2px] active:shadow-none ' +
                'focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-ink ' +
                (active ? 'bg-ink text-canvas' : 'bg-canvas text-ink hover:bg-muted')
              }
            >
              {label}
            </button>
          )
        })}
      </div>

      {visible.length > 0 ? (
        <ul className="flex items-start gap-4 overflow-x-auto pb-2">
          {visible.map(({ unit, accent }) => (
            <UnitCard
              key={unit.id}
              unit={unit}
              accent={accent}
              user={user}
              shelf={shelves?.get(unit.id)}
              runs={runs}
            />
          ))}
        </ul>
      ) : (
        <EmptyTab tab={tab} signedIn={!!user} />
      )}
    </PageShell>
  )
}

/** Per-tab empty state, in the existing muted text style. Signed-out users can
 *  only populate Today/Recently by signing in, so those offer a prompt. */
function EmptyTab({ tab, signedIn }: { tab: TabKey; signedIn: boolean }) {
  const copy: Record<TabKey, string> = {
    new: "You've completed every unit — nice work.",
    today: signedIn
      ? 'Nothing to review right now. Check back later.'
      : 'Sign in to see what’s due today.',
    recently: signedIn
      ? 'No lessons in progress yet. Start a new one.'
      : 'Sign in to track your progress.',
  }
  return (
    <div className="flex flex-col items-start gap-4 py-8">
      <p className="font-content text-ink/60">{copy[tab]}</p>
      {!signedIn && tab !== 'new' && (
        <ButtonLink to="/login" variant="blue" className="text-sm">
          Sign in
        </ButtonLink>
      )}
    </div>
  )
}
