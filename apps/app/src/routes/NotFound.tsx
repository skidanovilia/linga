import { Link } from 'react-router'

export function NotFound() {
  return (
    <div className="mx-auto flex min-h-full max-w-xl flex-col items-center justify-center gap-4 px-4 py-10 text-center">
      <p className="text-6xl font-bold text-slate-300">404</p>
      <h1 className="text-xl font-semibold">Page not found</h1>
      <Link to="/units" className="text-slate-900 underline underline-offset-4">
        Back to units
      </Link>
    </div>
  )
}
