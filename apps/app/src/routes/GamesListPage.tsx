import { PageShell } from '../components/PageShell'

/**
 * Placeholder for the Practice screen reached from the bottom nav. The real
 * games list is built by a sibling story and will replace this file's
 * contents; this just proves the nav wiring works end-to-end.
 */
export function GamesListPage() {
  return (
    <PageShell className="gap-6 py-10">
      <h1 className="font-display text-4xl font-black uppercase leading-none tracking-tighter md:text-6xl">
        Practice
      </h1>
      <p className="font-content text-ink/60">Games coming soon.</p>
    </PageShell>
  )
}
