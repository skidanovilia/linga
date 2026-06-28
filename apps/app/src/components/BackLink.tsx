import { ArrowLeft } from 'lucide-react'
import { ButtonLink } from './Button'

/** The recurring "back to units" link — a ghost button with a geometric arrow. */
export function BackLink({ to = '/units', label = 'Units' }: { to?: string; label?: string }) {
  return (
    <ButtonLink to={to} variant="ghost" className="font-display font-bold uppercase tracking-wide text-sm">
      <ArrowLeft className="h-4 w-4" strokeWidth={3} />
      {label}
    </ButtonLink>
  )
}
