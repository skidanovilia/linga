import { Link, useLoaderData } from 'react-router'
import type { Unit } from '../types/domain'
import { RUN_SIZE } from '../config'

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
          <li
            key={unit.id}
            className="rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm"
          >
            <p className="font-medium">{unit.title}</p>
            <div className="mt-3 flex gap-2">
              <Link
                to={`/units/${unit.id}`}
                className="flex-1 rounded-lg bg-slate-900 px-4 py-2 text-center text-sm font-semibold text-white transition hover:bg-slate-700"
              >
                Challenges · {Math.min(unit.challenges.length, RUN_SIZE.challenges)}
              </Link>
              <Link
                to={`/units/${unit.id}/memo`}
                className="flex-1 rounded-lg border border-slate-200 bg-white px-4 py-2 text-center text-sm font-semibold transition hover:border-slate-300"
              >
                Memo · {Math.min(unit.vocab.length, RUN_SIZE.vocab)}
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
