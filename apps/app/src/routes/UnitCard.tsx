import { Icon } from '@mdi/react'
import { mdiCheck, mdiLock } from '@mdi/js'
import type { User } from '@supabase/supabase-js'
import type { Unit } from '../types/domain'
import { shelfEntry, type ShelfEntry, type ShelfStatus } from '../lib/srs/shelf'
import type {
  ChallengeRunContextValue,
  ModuleStatus,
} from '../challenges/run/ChallengeRunProvider'
import { formatDue } from '../srs/formatDue'
import { ButtonLink, buttonClasses } from '../components/Button'
import { Card } from '../components/Card'
import { CompletionBadge } from '../components/CompletionBadge'

/** One of the three rotating Bauhaus primaries a card can be accented with. */
export type CardAccent = 'red' | 'blue' | 'yellow'

/**
 * The unit card — the exact surface shown on the units list, lifted verbatim so
 * every Explore tab renders the same markup. The only presentation the tab layer
 * adds is a fixed width + no-shrink so the cards line up in a horizontal row; the
 * card's own borders/shadow/padding/colors/actions are untouched.
 */
export function UnitCard({
  unit,
  accent,
  user,
  shelf,
  runs,
}: {
  unit: Unit
  accent: CardAccent
  user: User | null
  shelf: ShelfStatus | undefined
  runs: ChallengeRunContextValue
}) {
  return (
    <Card as="li" interactive decoration={accent} className="w-72 shrink-0 px-5 py-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-content text-lg font-bold">{unit.title}</p>
        {user && runs.ready && runs.hasUnitCompletion(unit) && <CompletionBadge />}
      </div>

      {/* Full-width vertical stack of the unit's actions: grammar (only
          when a section exists), memo cards, challenges. */}
      <div className="mt-3 flex flex-col gap-2">
        {user ? (
          <>
            {unit.grammar.length > 0 && (
              <ButtonLink
                to={`/units/${unit.id}/grammar`}
                variant="yellow"
                className="w-full text-sm"
              >
                Grammar
              </ButtonLink>
            )}
            <ShelfButton to={`/units/${unit.id}/review/cards`} status={shelf} />
            <ChallengeEntry
              to={`/units/${unit.id}/challenges`}
              ready={runs.ready}
              status={runs.ready ? runs.statusFor(unit) : undefined}
              remaining={runs.remainingFor(unit)}
            />
          </>
        ) : (
          <ButtonLink to="/login" variant="yellow" className="w-full text-sm">
            Sign in to review
          </ButtonLink>
        )}
      </div>
    </Card>
  )
}

/**
 * The memo-cards entry — one button whose *purpose*, not just its enabled state,
 * is derived entirely from the SRS engine's shelf summary (`undefined` status =
 * still loading). It is the introduction while words remain unmet and the
 * scheduled review afterwards, because a unit must be fully introduced before its
 * gate is even consulted; the route behind it reads the same `shelfEntry`, so the
 * two can never disagree.
 *
 * A disabled button is non-interactive and carries that with a dashed border +
 * lock icon + flattened shadow rather than color alone. It covers two cases the
 * hint must keep apart: a unit that has no vocabulary at all, and a shelf whose
 * lowest box has not fully ripened. Cards are never gated by challenge state.
 */
function ShelfButton({ to, status }: { to: string; status: ShelfStatus | undefined }) {
  if (!status) {
    // Loading: which of the two this entry is cannot be known yet, so it shows
    // the steady-state label a fully-introduced unit carries.
    return (
      <span className="w-full rounded-none border-2 border-dashed border-ink/30 bg-muted px-4 py-2 text-center font-display text-sm font-bold uppercase tracking-wide text-ink/30">
        Review cards
      </span>
    )
  }

  const entry = shelfEntry(status)
  const label = entry === 'introduce' ? 'Learn new words' : 'Review cards'
  const hint = shelfHint(entry, status)

  if (entry === 'none' || entry === 'waiting') {
    return (
      <button
        type="button"
        disabled
        className={buttonClasses({ variant: 'blue', className: 'w-full flex-col text-sm' })}
      >
        <span className="flex items-center gap-1.5">
          <Icon path={mdiLock} size="1rem" />
          {label}
        </span>
        <span className="mt-0.5 block font-content text-[11px] font-normal normal-case tracking-normal">
          {hint}
        </span>
      </button>
    )
  }

  return (
    <ButtonLink to={to} variant="blue" className="w-full flex-col text-sm">
      {label}
      <span className="mt-0.5 block font-content text-[11px] font-normal normal-case tracking-normal text-white/80">
        {hint}
      </span>
    </ButtonLink>
  )
}

/**
 * The line under the label — the shelf's state in a handful of words. There is no
 * mixed "due · new" case any more: while anything is new the entry is purely an
 * introduction, so each state has exactly one thing to say.
 */
function shelfHint(entry: ShelfEntry, status: ShelfStatus): string {
  switch (entry) {
    case 'none':
      // A unit with no vocabulary is not a finished one — don't claim a shelf
      // that never existed has been reviewed.
      return 'No cards yet'
    case 'introduce':
      return `${status.newCount} new`
    case 'review':
      return `${status.dueCount} due`
    case 'waiting':
      // Waiting on the clock. "All reviewed" would be a lie when items *are*
      // due — they simply sit above a box that has not ripened, and nothing is
      // available to review until it does. Either way the wait is measured to
      // `availableAt` (when the gate opens), never to `nextDueAt` (the first
      // item to ripen, which on its own opens nothing).
      return `${status.dueCount === 0 ? 'All reviewed' : 'Nothing to review'} · next ${formatDue(status.availableAt)}`
  }
}

/**
 * The challenge launch entry — always enabled, reflecting exactly three states
 * derived from module completion + the live in-memory run: not started (Start),
 * in progress (Resume, with the remaining count), or completed (Replay, with a
 * check). `undefined` status = still loading.
 */
function ChallengeEntry({
  to,
  ready,
  status,
  remaining,
}: {
  to: string
  ready: boolean
  status: ModuleStatus | undefined
  remaining: number | null
}) {
  if (!ready || !status) {
    return (
      <span className="w-full rounded-none border-2 border-dashed border-ink/30 bg-muted px-4 py-2 text-center font-display text-sm font-bold uppercase tracking-wide text-ink/30">
        Challenges
      </span>
    )
  }

  const { label, hint, icon } = challengeEntryCopy(status, remaining)
  return (
    <ButtonLink to={to} variant="red" className="w-full flex-col text-sm">
      <span className="flex items-center gap-1.5">
        {icon}
        {label}
      </span>
      {hint && (
        <span className="mt-0.5 block font-content text-[11px] font-normal normal-case tracking-normal text-white/80">
          {hint}
        </span>
      )}
    </ButtonLink>
  )
}

function challengeEntryCopy(status: ModuleStatus, remaining: number | null) {
  switch (status) {
    case 'in_progress':
      return {
        label: 'Resume challenges',
        hint: remaining != null ? `${remaining} left` : 'In progress',
        icon: null,
      }
    case 'completed':
      return {
        label: 'Replay challenges',
        hint: 'Completed',
        icon: <Icon path={mdiCheck} size="1rem" />,
      }
    default:
      return { label: 'Start challenges', hint: null, icon: null }
  }
}
