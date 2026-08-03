import { useState } from 'react'
import { useLoaderData } from 'react-router'
import type { Unit } from '../types/domain'
import { useAuth } from '../auth/useAuth'
import { useShelfStatus } from '../srs/useShelfStatus'
import { useChallengeRuns } from '../challenges/run/useChallengeRuns'
import { PageShell } from '../components/PageShell'
import { ButtonLink } from '../components/Button'
import { UnitCard, type CardAccent } from './UnitCard'
import { unitInTab, type UnitTab } from '../lib/srs/tabs'

// Rotate the three primaries across the unit cards for the constructivist rhythm.
const ACCENTS: CardAccent[] = ['red', 'blue', 'yellow']

const TABS: { key: UnitTab; label: string }[] = [
  { key: 'new', label: 'New' },
  { key: 'now', label: 'Now' },
  { key: 'recently', label: 'Recently' },
]

/**
 * Explore: the same unit cards regrouped into three slices of the one unit list,
 * each a horizontal scroll row. The tabs differ only by which units are visible —
 * the card itself is unchanged (see `UnitCard`). Membership is decided solely by
 * the unit's vocabulary memory state (see `lib/srs/tabs`), never by challenge runs
 * or completion badges:
 *  - New       — at least one word has never been introduced.
 *  - Now       — a word is due and none are left to introduce.
 *  - Recently  — everything introduced and everything scheduled ahead.
 * The three partition the list: a unit shown at all is shown in exactly one tab
 * (a unit with no vocabulary is shown in none). `runs` still feeds the card, just
 * not the tabs.
 */
export function UnitsListPage() {
  const units = useLoaderData() as Unit[]
  const { user } = useAuth()
  const shelves = useShelfStatus(units)
  const runs = useChallengeRuns()
  const [tab, setTab] = useState<UnitTab>('new')

  // Accent keyed on the unit's position in the full list, so a unit keeps the
  // same color as it moves between tabs.
  const cards = units.map((unit, i) => ({ unit, accent: ACCENTS[i % ACCENTS.length] }))

  // `shelves` is null both when signed out and while a signed-in user's progress
  // loads, so `user` is what separates "no rows exist" from "not read yet".
  const loading = !!user && shelves === null

  const inTab = (unit: Unit): boolean =>
    unitInTab(tab, shelves?.get(unit.id) ?? null, !!user)

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
        <EmptyTab tab={tab} signedIn={!!user} loading={loading} />
      )}
    </PageShell>
  )
}

/** Per-tab empty state, in the existing muted text style. Signed-out visitors can
 *  only populate Now/Recently by signing in, so those offer a prompt. While a
 *  signed-in user's progress loads, no unit belongs to any tab yet — that is not
 *  the same as "nothing here", so say so instead of claiming an empty shelf. */
function EmptyTab({
  tab,
  signedIn,
  loading,
}: {
  tab: UnitTab
  signedIn: boolean
  loading: boolean
}) {
  const copy: Record<UnitTab, string> = {
    new: 'Nothing new left — every word in every unit has been introduced.',
    now: signedIn
      ? 'Nothing to review right now. Check back later.'
      : 'Sign in to see what’s ready to review.',
    recently: signedIn
      ? // Recently is the leftover bucket, so it is empty only when every unit
        // still owes something: words to introduce (New) or a review due (Now).
        'Every unit still has work waiting — see New and Now.'
      : 'Sign in to track your progress.',
  }
  return (
    <div className="flex flex-col items-start gap-4 py-8">
      <p className="font-content text-ink/60">{loading ? 'Loading your progress…' : copy[tab]}</p>
      {!loading && !signedIn && tab !== 'new' && (
        <ButtonLink to="/login" variant="blue" className="text-sm">
          Sign in
        </ButtonLink>
      )}
    </div>
  )
}
