import { mdiCardsOutline } from '@mdi/js'

export interface Game {
  id: string
  label: string
  description: string
  icon: string
  to: string
}

export const GAMES: Game[] = [
  {
    id: 'free-vocab',
    label: 'Free vocabulary practice',
    description: 'Flip and swipe through 20 random words you’ve started learning, in either direction.',
    icon: mdiCardsOutline,
    to: '/practice/vocab',
  },
]
