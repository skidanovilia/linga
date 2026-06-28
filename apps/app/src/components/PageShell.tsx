import type { ReactNode } from 'react'

interface PageShellProps {
  children: ReactNode
  /** Column width: 'xl' = max-w-xl (default), 'sm' = max-w-sm (the login form). */
  size?: 'sm' | 'xl'
  /** Vertically/horizontally center the content (result, login, 404, empty states). */
  center?: boolean
  className?: string
}

/**
 * The standard page column, centered with consistent gutters. Relies on the
 * full-height html/body/#root chain from index.css for `min-h-full`.
 */
export function PageShell({ children, size = 'xl', center = false, className = '' }: PageShellProps) {
  return (
    <div
      className={`mx-auto flex min-h-full flex-col px-4 py-6 ${
        size === 'sm' ? 'max-w-sm' : 'max-w-xl'
      } ${center ? 'items-center justify-center' : ''} ${className}`}
    >
      {children}
    </div>
  )
}
