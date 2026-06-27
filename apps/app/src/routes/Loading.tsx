// Shown during the initial client hydration while the first route loader
// (now an async Supabase query) resolves.
export function Loading() {
  return (
    <div className="mx-auto flex min-h-full max-w-xl flex-col items-center justify-center gap-4 px-4 py-10 text-center">
      <p className="text-sm font-medium text-slate-400">Loading…</p>
    </div>
  )
}
