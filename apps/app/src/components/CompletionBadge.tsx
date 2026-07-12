import { Icon } from '@mdi/react'
import { mdiCheckDecagram } from '@mdi/js'

/**
 * The permanent "unit completed" badge shown on a unit card once the user has
 * passed all of its challenges at least once. Bauhaus celebratory yellow with a
 * hard border/shadow; encoded by icon + text (never color alone). The label is
 * Latin chrome, so uppercase font-display is on-brand (unlike ka/ru content).
 * Distinct from the run button's transient "Completed" hint — this never clears.
 */
export function CompletionBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border-2 border-ink bg-bauhaus-yellow px-2 py-0.5 font-display text-[11px] font-bold uppercase tracking-wide text-ink shadow-hard-sm">
      <Icon path={mdiCheckDecagram} size="0.75rem" />
      Completed
    </span>
  )
}
