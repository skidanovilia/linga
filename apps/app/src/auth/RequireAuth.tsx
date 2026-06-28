import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { useAuth } from './useAuth'
import { Loading } from '../routes/Loading'

/**
 * Gate for the scheduled-review routes. While the initial session check is in
 * flight we show the loader (so a returning user isn't bounced); with no session
 * we redirect to `/login`, remembering where they were headed.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth()
  const location = useLocation()

  if (loading) return <Loading />
  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  return <>{children}</>
}
