// Shown during the initial client hydration while the first route loader
// (now an async Supabase query) resolves. Deliberately dependency-free — no
// lucide on the hydration path — using a CSS-only mechanical Bauhaus spinner.
export function Loading() {
  return (
    <div className="mx-auto flex min-h-full max-w-xl flex-col items-center justify-center gap-4 px-4 py-10 text-center">
      <div className="h-8 w-8 animate-spin rounded-none border-4 border-ink border-t-bauhaus-red" />
      <p className="font-display text-sm font-bold uppercase tracking-widest text-ink/60">Loading…</p>
    </div>
  )
}
