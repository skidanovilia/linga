import { Icon } from '@mdi/react'
import { PageShell } from '../components/PageShell'
import { ButtonLink } from '../components/Button'
import { GAMES } from '../games/registry'

/**
 * The Practice screen, reached from the bottom nav. Lists every built-in
 * mini-game as a launch button — the games themselves are static, code-defined
 * entries (see `games/registry.ts`), not Supabase content.
 */
export function GamesListPage() {
  return (
    <PageShell className="gap-6 py-10">
      <h1 className="font-display text-4xl font-black uppercase leading-none tracking-tighter md:text-6xl">
        Practice
      </h1>

      <ul className="flex flex-col gap-3">
        {GAMES.map((game) => (
          <li key={game.id}>
            <ButtonLink to={game.to} variant="blue" className="w-full flex-col items-start gap-1 text-sm">
              <span className="flex items-center gap-1.5">
                <Icon path={game.icon} size="1.25rem" />
                {game.label}
              </span>
              <span className="block font-content text-[11px] font-normal normal-case tracking-normal text-white/80">
                {game.description}
              </span>
            </ButtonLink>
          </li>
        ))}
      </ul>
    </PageShell>
  )
}
