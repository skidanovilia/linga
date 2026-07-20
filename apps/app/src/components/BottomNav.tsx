import { NavLink } from 'react-router'
import { Icon } from '@mdi/react'
import { mdiAccount, mdiAccountOutline, mdiCompass, mdiCompassOutline } from '@mdi/js'

/**
 * The app's two top-level destinations. The outline glyph marks the inactive
 * tab, the filled one the active tab — state is encoded by icon + label + ink
 * weight, never color alone (there is no color on this bar).
 */
const ITEMS = [
  { to: '/units', label: 'Explore', icon: mdiCompassOutline, activeIcon: mdiCompass },
  { to: '/profile', label: 'Profile', icon: mdiAccountOutline, activeIcon: mdiAccount },
] as const

/**
 * The persistent two-item bottom navigation shown on the top-level Explore and
 * Profile screens. Fixed to the viewport bottom with a thick ink top rule; the
 * layout that mounts it pads its content so nothing hides behind the bar.
 */
export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 flex border-t-4 border-ink bg-white">
      {ITEMS.map(({ to, label, icon, activeIcon }) => (
        <NavLink
          key={to}
          to={to}
          end
          className={({ isActive }) =>
            'flex flex-1 flex-col items-center justify-center gap-0.5 py-3 ' +
            'font-display text-xs font-bold uppercase tracking-tight transition-colors duration-200 ' +
            (isActive ? 'text-ink' : 'text-ink/50 hover:text-ink')
          }
        >
          {({ isActive }) => (
            <>
              <Icon path={isActive ? activeIcon : icon} size="1.5rem" />
              {label}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
