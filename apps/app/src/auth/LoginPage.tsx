import { useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router'
import { X } from 'lucide-react'
import { useAuth } from './useAuth'
import { PageShell } from '../components/PageShell'
import { GeometricLogo } from '../components/GeometricLogo'
import { Button, ButtonLink } from '../components/Button'
import { Input } from '../components/Input'

type Mode = 'login' | 'signup'

/**
 * Email/password sign-in and sign-up (`/login`). On success it returns the user
 * to wherever a guard sent them from, defaulting to the units list. (Locally,
 * email confirmations are off, so a sign-up immediately yields a session.)
 */
export function LoginPage() {
  const { signIn, signUp, session } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/units'

  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // Already signed in — skip the form.
  if (session) return <Navigate to={from} replace />

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    const action = mode === 'login' ? signIn : signUp
    const { error: err } = await action(email, password)
    setBusy(false)
    if (err) {
      setError(err)
      return
    }
    navigate(from, { replace: true })
  }

  return (
    <PageShell size="sm" center className="gap-6 py-10">
      <header className="flex flex-col items-center text-center">
        <GeometricLogo size={44} />
        <h1 className="mt-3 font-display text-4xl font-black uppercase leading-none tracking-tighter">
          Linga
        </h1>
        <p className="mt-2 font-content text-ink/70">
          {mode === 'login' ? 'Sign in to track your reviews.' : 'Create an account.'}
        </p>
      </header>

      <form onSubmit={handleSubmit} className="flex w-full flex-col gap-3">
        <Input
          type="email"
          required
          autoComplete="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          type="password"
          required
          minLength={6}
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && (
          <p className="flex items-center gap-1.5 font-content text-sm font-bold text-bauhaus-red">
            <X className="h-4 w-4 shrink-0" strokeWidth={3} />
            {error}
          </p>
        )}

        <Button type="submit" variant="blue" disabled={busy} className="w-full">
          {busy ? '…' : mode === 'login' ? 'Sign in' : 'Sign up'}
        </Button>
      </form>

      <div className="flex w-full items-center justify-between font-content text-sm text-ink/60">
        <Button
          variant="ghost"
          onClick={() => {
            setMode(mode === 'login' ? 'signup' : 'login')
            setError(null)
          }}
        >
          {mode === 'login' ? 'Need an account? Sign up' : 'Have an account? Sign in'}
        </Button>
        <ButtonLink to="/units" variant="ghost">
          Browse →
        </ButtonLink>
      </div>
    </PageShell>
  )
}
