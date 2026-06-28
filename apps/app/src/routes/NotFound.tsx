import { PageShell } from '../components/PageShell'
import { ButtonLink } from '../components/Button'
import { Shape } from '../components/Shape'

export function NotFound() {
  return (
    <PageShell center className="gap-6 py-10 text-center">
      <div className="flex items-center gap-4">
        <p className="font-display text-7xl font-black text-bauhaus-red">404</p>
        <Shape kind="square" color="blue" size={40} rotated className="border-4 border-ink" />
      </div>
      <h1 className="font-display text-xl font-bold uppercase tracking-tight">Page not found</h1>
      <ButtonLink to="/units" variant="outline">
        Back to units
      </ButtonLink>
    </PageShell>
  )
}
