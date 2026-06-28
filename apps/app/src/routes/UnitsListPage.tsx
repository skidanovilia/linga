import { Link, useLoaderData } from 'react-router'
import type { Unit } from '../types/domain'
import type { ShelfStatus } from '../lib/srs/shelf'
import { useAuth } from '../auth/useAuth'
import { useShelfStatus } from '../srs/useShelfStatus'
import { formatDue } from '../srs/formatDue'

export function UnitsListPage() {
  const units = useLoaderData() as Unit[]
  const { user, signOut } = useAuth()
  const shelves = useShelfStatus(units)

  return (
    <div className="mx-auto flex min-h-full max-w-xl flex-col gap-6 px-4 py-10">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Linga</h1>
          <p className="mt-1 text-slate-500">Review what's due, or practice freely.</p>
        </div>
        {user ? (
          <div className="text-right text-sm text-slate-500">
            <p className="max-w-[12rem] truncate">{user.email}</p>
            <button type="button" onClick={() => void signOut()} className="hover:text-slate-900">
              Sign out
            </button>
          </div>
        ) : (
          <Link
            to="/login"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            Sign in
          </Link>
        )}
      </header>

      <ul className="flex flex-col gap-3">
        {units.map((unit) => {
          const status = shelves?.get(unit.id)
          return (
            <li
              key={unit.id}
              className="rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm"
            >
              <p className="font-medium">{unit.title}</p>

              {/* Scheduled review — one launch button per shelf, gated per shelf. */}
              <div className="mt-3 flex gap-2">
                {user ? (
                  <>
                    <ShelfButton
                      to={`/units/${unit.id}/review/cards`}
                      label="Review cards"
                      status={status?.cards}
                    />
                    <ShelfButton
                      to={`/units/${unit.id}/review/challenges`}
                      label="Review challenges"
                      status={status?.challenges}
                    />
                  </>
                ) : (
                  <Link
                    to="/login"
                    className="flex-1 rounded-lg bg-slate-900 px-4 py-2 text-center text-sm font-semibold text-white transition hover:bg-slate-700"
                  >
                    Sign in to review
                  </Link>
                )}
              </div>

              {/* Free practice — never moves the shelf. */}
              <div className="mt-2 flex gap-3 text-sm text-slate-500">
                <span>Practice freely:</span>
                <Link to={`/units/${unit.id}`} className="hover:text-slate-900">
                  Challenges
                </Link>
                <Link to={`/units/${unit.id}/memo`} className="hover:text-slate-900">
                  Memo
                </Link>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/**
 * One shelf's launch button, its enabled/disabled state derived entirely from
 * the engine's shelf summary. `undefined` status = still loading. A disabled
 * button shows the "all reviewed — next due at T" state and is non-interactive.
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
      <span className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-center text-sm font-semibold text-slate-300">
        {label}
      </span>
    )
  }

  if (!status.enabled) {
    return (
      <button
        type="button"
        disabled
        className="flex-1 cursor-not-allowed rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-center text-sm font-semibold text-slate-400"
      >
        {label}
        <span className="mt-0.5 block text-[11px] font-normal">
          All reviewed · next {formatDue(status.nextDueAt)}
        </span>
      </button>
    )
  }

  return (
    <Link
      to={to}
      className="flex-1 rounded-lg bg-slate-900 px-4 py-2 text-center text-sm font-semibold text-white transition hover:bg-slate-700"
    >
      {label}
      <span className="mt-0.5 block text-[11px] font-normal text-slate-300">
        {shelfHint(status)}
      </span>
    </Link>
  )
}

function shelfHint(status: ShelfStatus): string {
  const parts: string[] = []
  if (status.dueCount > 0) parts.push(`${status.dueCount} due`)
  if (status.newCount > 0) parts.push(`${status.newCount} new`)
  return parts.join(' · ')
}
