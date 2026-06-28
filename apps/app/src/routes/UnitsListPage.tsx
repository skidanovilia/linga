import { Link, useLoaderData } from 'react-router'
import { Lock } from 'lucide-react'
import type { Unit } from '../types/domain'
import type { ShelfStatus } from '../lib/srs/shelf'
import { useAuth } from '../auth/useAuth'
import { useShelfStatus } from '../srs/useShelfStatus'
import { formatDue } from '../srs/formatDue'
import { PageShell } from '../components/PageShell'
import { GeometricLogo } from '../components/GeometricLogo'
import { Button, ButtonLink, buttonClasses } from '../components/Button'
import { Card } from '../components/Card'
import { Shape } from '../components/Shape'

// Rotate the three primaries across the unit cards for the constructivist rhythm.
const ACCENTS = ['red', 'blue', 'yellow'] as const

export function UnitsListPage() {
  const units = useLoaderData() as Unit[]
  const { user, signOut } = useAuth()
  const shelves = useShelfStatus(units)

  return (
    <PageShell className="gap-6 py-10">
      <header className="flex items-start justify-between border-b-4 border-ink pb-6">
        <div className="flex items-center gap-3">
          <GeometricLogo size={40} />
          <div>
            <h1 className="font-display text-4xl font-black uppercase leading-none tracking-tighter md:text-6xl">
              Linga
            </h1>
            <p className="mt-1 font-content text-ink/70">Review what's due, or practice freely.</p>
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
          const status = shelves?.get(unit.id)
          const accent = ACCENTS[i % ACCENTS.length]
          return (
            <Card as="li" key={unit.id} interactive decoration={accent} className="px-5 py-4">
              <p className="font-content text-lg font-bold">{unit.title}</p>

              {/* Scheduled review — one launch button per shelf, gated per shelf. */}
              <div className="mt-3 flex gap-2">
                {user ? (
                  <>
                    <ShelfButton
                      to={`/units/${unit.id}/review/cards`}
                      label="Review cards"
                      variant="blue"
                      status={status?.cards}
                    />
                    <ShelfButton
                      to={`/units/${unit.id}/review/challenges`}
                      label="Review challenges"
                      variant="red"
                      status={status?.challenges}
                    />
                  </>
                ) : (
                  <ButtonLink to="/login" variant="yellow" className="flex-1 text-sm">
                    Sign in to review
                  </ButtonLink>
                )}
              </div>

              {/* Free practice — never moves the shelf. */}
              <div className="mt-3 flex items-center gap-3 font-content text-sm text-ink/60">
                <span className="font-display font-bold uppercase tracking-wide">Practice freely:</span>
                <Link
                  to={`/units/${unit.id}`}
                  className="inline-flex items-center gap-1.5 font-medium hover:text-bauhaus-blue"
                >
                  <Shape kind="square" color="blue" size={8} /> Challenges
                </Link>
                <Link
                  to={`/units/${unit.id}/memo`}
                  className="inline-flex items-center gap-1.5 font-medium hover:text-bauhaus-red"
                >
                  <Shape kind="circle" color="red" size={8} /> Memo
                </Link>
              </div>
            </Card>
          )
        })}
      </ul>
    </PageShell>
  )
}

/**
 * One shelf's launch button, its enabled/disabled state derived entirely from
 * the engine's shelf summary. `undefined` status = still loading. A disabled
 * button shows the "all reviewed — next due at T" state and is non-interactive;
 * its dashed border + lock icon + flattened shadow carry the disabled state
 * without relying on color alone.
 */
function ShelfButton({
  to,
  label,
  variant,
  status,
}: {
  to: string
  label: string
  variant: 'blue' | 'red'
  status: ShelfStatus | undefined
}) {
  if (!status) {
    return (
      <span className="flex-1 rounded-none border-2 border-dashed border-ink/30 bg-muted px-4 py-2 text-center font-display text-sm font-bold uppercase tracking-wide text-ink/30">
        {label}
      </span>
    )
  }

  if (!status.enabled) {
    return (
      <button
        type="button"
        disabled
        className={buttonClasses({ variant, className: 'flex-1 flex-col text-sm' })}
      >
        <span className="flex items-center gap-1.5">
          <Lock className="h-4 w-4" strokeWidth={3} />
          {label}
        </span>
        <span className="mt-0.5 block font-content text-[11px] font-normal normal-case tracking-normal">
          All reviewed · next {formatDue(status.nextDueAt)}
        </span>
      </button>
    )
  }

  return (
    <ButtonLink to={to} variant={variant} className="flex-1 flex-col text-sm">
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
