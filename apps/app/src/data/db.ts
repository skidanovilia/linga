import type { LoaderFunctionArgs } from 'react-router'
import type { Challenge, Unit, VocabEntry } from '../types/domain'
import { supabase } from './supabase'

// The Supabase database is our read-only source for units. Funnelling every
// read through this module keeps the source swappable: pages and components
// consume the `Unit` shape these functions return and stay untouched.

// One round-trip per query: pull the unit with its nested vocab + challenges,
// plus the optional grammar pages. The vocab/challenge `id`s are surfaced because
// the review shelf keys each item's Leitner box on the content row's stable UUID.
// Grammar pages carry no user state, so only their content + order matter.
const UNIT_SELECT =
  'id, title, position, vocab(id, ka, ru), challenges(id, type, data), grammar_pages(position, content)'

interface UnitRow {
  id: string
  title: string
  position: number
  vocab: VocabEntry[]
  challenges: Challenge[]
  grammar_pages: { position: number; content: string }[]
}

// Map a DB row onto the domain `Unit`. Vocab/challenges come back in their
// natural insertion order (no `position` column on those tables) — that order
// doubles as the "content order" the scheduler introduces new items in.
function toUnit(row: UnitRow): Unit {
  return {
    id: row.id,
    title: row.title,
    // PostgREST doesn't guarantee embedded-resource order, so sort by position.
    grammar: [...row.grammar_pages].sort((a, b) => a.position - b.position).map((p) => p.content),
    vocab: row.vocab.map(({ id, ka, ru }) => ({ id, ka, ru })),
    challenges: row.challenges.map(
      (c) => ({ id: c.id, type: c.type, data: c.data }) as Challenge,
    ),
  }
}

export async function getUnits(): Promise<Unit[]> {
  const { data, error } = await supabase
    .from('units')
    .select(UNIT_SELECT)
    .order('position')
  if (error) {
    throw new Response(error.message, { status: 500 })
  }
  return (data as unknown as UnitRow[]).map(toUnit)
}

export async function getUnit(id: string): Promise<Unit | undefined> {
  const { data, error } = await supabase
    .from('units')
    .select(UNIT_SELECT)
    .eq('id', id)
    .maybeSingle()
  if (error) {
    throw new Response(error.message, { status: 500 })
  }
  return data ? toUnit(data as unknown as UnitRow) : undefined
}

// --- React Router loaders -------------------------------------------------

export async function unitsLoader(): Promise<Unit[]> {
  return getUnits()
}

export async function unitLoader({ params }: LoaderFunctionArgs): Promise<Unit> {
  const unit = await getUnit(params.unitId ?? '')
  if (!unit) {
    throw new Response('Unit not found', { status: 404 })
  }
  return unit
}

// --- Profile statistics ---------------------------------------------------

/**
 * Count of "learned words": vocab the signed-in user has started — i.e. has any
 * `vocab_progress` row for. RLS scopes the table to `auth.uid()`, so a bare count
 * over the whole table already means "this user's rows". Head-only: no rows are
 * transferred, just the count. Call only when signed in.
 */
export async function getLearnedWordsCount(): Promise<number> {
  const { count, error } = await supabase
    .from('vocab_progress')
    .select('vocab_id', { count: 'exact', head: true })
  if (error) {
    throw new Error(error.message)
  }
  return count ?? 0
}
