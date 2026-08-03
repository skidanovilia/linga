import { Icon } from '@mdi/react'
import { mdiCheck, mdiLock } from '@mdi/js'
import type { User } from '@supabase/supabase-js'
import type { Unit } from '../types/domain'
import type { ShelfStatus } from '../lib/srs/shelf'
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
            <ShelfButton
              to={`/units/${unit.id}/review/cards`}
              label="Review cards"
              status={shelf}
            />
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
 * The memo-cards launch button, its enabled/disabled state derived entirely from
 * the SRS engine's shelf summary. `undefined` status = still loading. A disabled
 * button is non-interactive and shows either the "all reviewed — next due at T"
 * state or, for a unit that has no vocabulary at all, "no cards yet"; its dashed
 * border + lock icon + flattened shadow carry the disabled state without relying
 * on color alone. Cards are never gated by challenge state.
 */
function ShelfButton({
  to,
  label,
  status,
}: {
  to: string
  label: string
  status: ShelfStatus | undefined
}) {
  if (!status) {
    return (
      <span className="w-full rounded-none border-2 border-dashed border-ink/30 bg-muted px-4 py-2 text-center font-display text-sm font-bold uppercase tracking-wide text-ink/30">
        {label}
      </span>
    )
  }

  if (!status.enabled) {
    // A unit with no vocabulary is not a finished one — don't claim a shelf
    // that never existed has been reviewed.
    const hint =
      status.total === 0
        ? 'No cards yet'
        : `All reviewed · next ${formatDue(status.nextDueAt)}`
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
        {shelfHint(status)}
      </span>
    </ButtonLink>
  )
}

function shelfHint(status: ShelfStatus): string {
  const parts: string[] = []
  if (status.dueCount > 0) parts.push(`${status.dueCount} due`)
  if (status.newCount > 0) parts.push(`${status.newCount} new`)
  return parts.join(' · ')
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
