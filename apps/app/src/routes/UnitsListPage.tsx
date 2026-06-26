import { Link, useLoaderData } from 'react-router'
import type { Unit } from '../types/domain'

export function UnitsListPage() {
  const units = useLoaderData() as Unit[]

  return (
    <div className="mx-auto flex min-h-full max-w-xl flex-col gap-6 px-4 py-10">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Linga</h1>
        <p className="mt-1 text-slate-500">Choose a unit to practice.</p>
      </header>

      <ul className="flex flex-col gap-3">
        {units.map((unit) => (
          <li key={unit.id}>
            <Link
              to={`/units/${unit.id}`}
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm transition hover:border-slate-300 hover:shadow"
            >
              <span className="font-medium">{unit.title}</span>
              <span className="text-sm text-slate-400">
                {unit.challenges.length} exercises
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
