import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { useAuth } from '../auth/useAuth'
import { getLearnedWordsCount } from '../data/db'
import { PageShell } from '../components/PageShell'
import { Button } from '../components/Button'
import { Card } from '../components/Card'

/**
 * The Profile screen, reached from the bottom nav. Shows who the user is (name,
 * email), a learned-words statistic, and the sign-out action relocated here from
 * the old units header. Mounted behind `RequireAuth`, so `user` is always set.
 */
export function ProfilePage() {
  const { user, signOut } = useAuth()
  const [learned, setLearned] = useState<number | null>(null)

  useEffect(() => {
    if (!user?.id) return
    let active = true
    getLearnedWordsCount()
      .then((n) => {
        if (active) setLearned(n)
      })
      .catch(() => {
        if (active) setLearned(0)
      })
    return () => {
      active = false
    }
  }, [user?.id])

  if (!user) return null

  return (
    <PageShell className="gap-6 py-10">
      <h1 className="font-display text-4xl font-black uppercase leading-none tracking-tighter md:text-6xl">
        Profile
      </h1>

      <div className="flex flex-col gap-4">
        <Field label="Name" value={displayName(user)} />
        <Field label="Email" value={user.email ?? '—'} />
        <StatCard label="Learned words" value={learned} />
      </div>

      <Button variant="outline" onClick={() => void signOut()} className="self-start">
        Sign out
      </Button>
    </PageShell>
  )
}

/** A labelled read-only detail row (name, email). */
function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-display text-xs font-bold uppercase tracking-wide text-ink/50">{label}</p>
      <p className="break-words font-content text-lg font-bold">{value}</p>
    </div>
  )
}

/** The learned-words statistic as a celebratory yellow-accented card. */
function StatCard({ label, value }: { label: string; value: number | null }) {
  return (
    <Card decoration="yellow" decorationShape="circle" className="px-5 py-4">
      <p className="font-display text-xs font-bold uppercase tracking-wide text-ink/50">{label}</p>
      <p className="font-display text-5xl font-black leading-none tabular-nums">{value ?? 0}</p>
    </Card>
  )
}

/** Prefer a stored display name (Supabase user_metadata); fall back to the email
 *  local-part, since no name column exists. */
function displayName(user: User): string {
  const meta = user.user_metadata as { full_name?: string; name?: string } | undefined
  return meta?.full_name ?? meta?.name ?? user.email?.split('@')[0] ?? 'You'
}
