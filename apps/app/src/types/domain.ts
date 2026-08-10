// The core domain model. A `Unit` is a set of `Challenge`s; each `Challenge`
// is a discriminated union keyed on `type`, so its `data` shape is narrowed
// per member. Adding a new challenge type starts here (add a *Data interface
// and a union member), then add a component + registry entry under `challenges/`.

export type ChallengeType = 'fill_choice' | 'order' | 'fill_type' | 'translate'

/** fill_choice — fill one or more blanks by picking words from buttons. */
export interface FillChoiceData {
  /** Sentence to complete; contains one or more `___` gap markers. */
  sentence: string
  /** The correct word for each `___`, in order (one entry per gap). */
  answer: string[]
  /** All selectable options (includes every `answer` word); shuffled only for display. */
  options: string[]
}

/** order — translate from Russian by assembling words in order. */
export interface OrderData {
  /** The Russian prompt shown on top. */
  ru: string
  /** Accepted orderings of the Georgian words; the answer is correct if it
   *  matches any one of them. */
  answer: string[][]
}

/** fill_type — type the missing word with the keyboard. */
export interface FillTypeData {
  /** Sentence to complete; contains the `___` gap marker. */
  sentence: string
  /** The expected typed word. */
  answer: string
}

/** translate — type the full Georgian translation of a Russian prompt from
 *  scratch (no word bank). Same `data` shape as `order`, but the inner arrays
 *  need not be permutations of one another: because typing is unconstrained,
 *  they may be genuinely different valid sentences (e.g. a contracted form and
 *  a full form). The answer is correct if it matches any one ordering. */
export interface TranslateData {
  /** The Russian prompt shown on top. */
  ru: string
  /** Accepted orderings of the Georgian words, each an ordered token list. */
  answer: string[][]
}

/** Discriminated union keyed on `type`; `data` narrows per member. The `id` is
 *  the content row's stable UUID — the key the spaced-repetition shelf uses, so
 *  reordering or editing content never resets progress. */
export type Challenge =
  | { id: string; type: 'fill_choice'; data: FillChoiceData }
  | { id: string; type: 'order'; data: OrderData }
  | { id: string; type: 'fill_type'; data: FillTypeData }
  | { id: string; type: 'translate'; data: TranslateData }

/** A single vocabulary pair, used as a memo (flashcard) card. */
export interface VocabEntry {
  /** Content row UUID — the stable key for the memo-card review shelf. */
  id: string
  /** Georgian — the prompt side in free practice, the answer in scheduled review. */
  ka: string
  /** Russian — the prompt side in scheduled review, the answer in free practice. */
  ru: string
}

export interface Unit {
  /** Stable, authored id used in URLs (e.g. "food-1"). */
  id: string
  title: string
  /** Optional grammar section: ordered markdown pages, read-only and stateless.
   *  Empty array = no section (the grammar button is then omitted entirely). */
  grammar: string[]
  /** Word pairs powering the unit's memo-card deck. */
  vocab: VocabEntry[]
  challenges: Challenge[]
}
