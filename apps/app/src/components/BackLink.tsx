import { Icon } from '@mdi/react'
import { mdiArrowLeft } from '@mdi/js'
import { ButtonLink } from './Button'

/** The recurring "back to units" link — a ghost button with a geometric arrow. */
export function BackLink({ to = '/units', label = 'Units' }: { to?: string; label?: string }) {
  return (
    <ButtonLink to={to} variant="ghost" className="font-display font-bold uppercase tracking-wide text-sm">
      <Icon path={mdiArrowLeft} size="1rem" />
      {label}
    </ButtonLink>
  )
}
