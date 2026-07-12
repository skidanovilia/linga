import { useLoaderData } from 'react-router'
import { Icon } from '@mdi/react'
import { mdiCheck, mdiLock } from '@mdi/js'
import type { Unit } from '../types/domain'
import type { ShelfStatus } from '../lib/srs/shelf'
import { useAuth } from '../auth/useAuth'
import { useShelfStatus } from '../srs/useShelfStatus'
import { useChallengeRuns } from '../challenges/run/useChallengeRuns'
import type { ModuleStatus } from '../challenges/run/ChallengeRunProvider'
import { formatDue } from '../srs/formatDue'
import { PageShell } from '../components/PageShell'
import { GeometricLogo } from '../components/GeometricLogo'
import { Button, ButtonLink, buttonClasses } from '../components/Button'
import { Card } from '../components/Card'

// Rotate the three primaries across the unit cards for the constructivist rhythm.
const ACCENTS = ['red', 'blue', 'yellow'] as const

export function UnitsListPage() {
  const units = useLoaderData() as Unit[]
  const { user, signOut } = useAuth()
  const shelves = useShelfStatus(units)
  const runs = useChallengeRuns()

  return (
    <PageShell className="gap-6 py-10">
      <header className="flex items-start justify-between border-b-4 border-ink pb-6">
        <div className="flex items-center gap-3">
          <GeometricLogo size={40} />
          <div>
            <h1 className="font-display text-4xl font-black uppercase leading-none tracking-tighter md:text-6xl">
              Linga
            </h1>
            <p className="mt-1 font-content text-ink/70">Review your cards and clear the challenges.</p>
          </div>
        </div>
        {user ? (
          <div className="text-right font-content text-sm text-ink/60">
            <p className="max-w-[12rem] truncate">{user.email}</p>
            <Button variant="ghost" onClick={() => void signOut()}>
              Sign out
            </Button>
          </div>
        ) : (
          <ButtonLink to="/login" variant="blue" className="text-sm">
            Sign in
          </ButtonLink>
        )}
      </header>

      <ul className="flex flex-col gap-4">
        {units.map((unit, i) => {
          const accent = ACCENTS[i % ACCENTS.length]
          return (
            <Card as="li" key={unit.id} interactive decoration={accent} className="px-5 py-4">
              <p className="font-content text-lg font-bold">{unit.title}</p>

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
                      status={shelves?.get(unit.id)}
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
        })}
      </ul>
    </PageShell>
  )
}

/**
 * The memo-cards launch button, its enabled/disabled state derived entirely from
 * the SRS engine's shelf summary. `undefined` status = still loading. A disabled
 * button shows the "all reviewed — next due at T" state and is non-interactive;
 * its dashed border + lock icon + flattened shadow carry the disabled state
 * without relying on color alone. Cards are never gated by challenge state.
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
          All reviewed · next {formatDue(status.nextDueAt)}
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
