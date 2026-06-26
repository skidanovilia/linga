// The core domain model. A `Unit` is a set of `Challenge`s; each `Challenge`
// is a discriminated union keyed on `type`, so its `data` shape is narrowed
// per member. Adding a new challenge type starts here (add a *Data interface
// and a union member), then add a component + registry entry under `challenges/`.

export type ChallengeType = 'fill_choice' | 'order' | 'fill_type'

/** fill_choice — pick the missing word from buttons. */
export interface FillChoiceData {
  /** Sentence to complete; contains the `___` gap marker. */
  sentence: string
  /** The correct option. */
  answer: string
  /** All selectable options (includes `answer`); shuffled only for display. */
  options: string[]
}

/** order — translate from Russian by assembling words in order. */
export interface OrderData {
  /** The Russian prompt shown on top. */
  ru: string
  /** The correct, ordered sequence of Georgian words. */
  answer: string[]
}

/** fill_type — type the missing word with the keyboard. */
export interface FillTypeData {
  /** Sentence to complete; contains the `___` gap marker. */
  sentence: string
  /** The expected typed word. */
  answer: string
}

/** Discriminated union keyed on `type`; `data` narrows per member. */
export type Challenge =
  | { type: 'fill_choice'; data: FillChoiceData }
  | { type: 'order'; data: OrderData }
  | { type: 'fill_type'; data: FillTypeData }

/** A single vocabulary pair, used as a memo (flashcard) card. */
export interface VocabEntry {
  /** Georgian — shown on the card's back. */
  ka: string
  /** Russian — shown on the card's front. */
  ru: string
}

export interface Unit {
  /** Stable, authored id used in URLs (e.g. "food-1"). */
  id: string
  title: string
  /** Word pairs powering the unit's memo-card deck. */
  vocab: VocabEntry[]
  challenges: Challenge[]
}
