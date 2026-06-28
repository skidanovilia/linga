import { useContext } from 'react'
import { AuthContext, type AuthContextValue } from './AuthProvider'

/** Access the auth context; throws if used outside `<AuthProvider>`. */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within <AuthProvider>')
  }
  return ctx
}
