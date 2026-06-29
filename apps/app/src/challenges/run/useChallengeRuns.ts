import { useContext } from 'react'
import { ChallengeRunContext, type ChallengeRunContextValue } from './ChallengeRunProvider'

/** Access the app-wide challenge run state; throws if used outside the provider. */
export function useChallengeRuns(): ChallengeRunContextValue {
  const ctx = useContext(ChallengeRunContext)
  if (!ctx) {
    throw new Error('useChallengeRuns must be used within <ChallengeRunProvider>')
  }
  return ctx
}
