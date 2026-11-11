/**
 * Core Wordle mechanics: evaluating guesses, filtering word lists and grouping
 * words into "bins" (the set of answers that would produce the same colours).
 *
 * Evaluation keys are strings of `G` (green), `Y` (yellow) and `-` (grey), one
 * character per letter. All words are expected to be uppercase.
 */

export const WORD_LENGTH = 5

export type Mark = 'G' | 'Y' | '-'

export interface Guess {
  word: string
  key: string
}

/** Uppercase and trim a word. */
export const normalizeWord = (word: string): string => word.trim().toUpperCase()

/** Uppercase a key and turn anything that isn't G or Y into a dash. */
export const normalizeKey = (key: string): string => key.trim().toUpperCase().replace(/[^GY]/g, '-')

export const isValidWord = (word: string): boolean => /^[A-Z]{5}$/.test(word)

export const isValidKey = (key: string): boolean => /^[GY-]{5}$/.test(key)

/** The colour a guess would receive against `answer`, e.g. `YG--Y`. */
export function evaluate(guess: string, answer: string): string {
  const length = guess.length
  const marks: Mark[] = new Array(length).fill('-')
  // Letters of the answer that have not been matched as green yet.
  const remaining = new Map<string, number>()

  for (let i = 0; i < length; i++) {
    if (guess[i] === answer[i]) {
      marks[i] = 'G'
    } else {
      remaining.set(answer[i], (remaining.get(answer[i]) ?? 0) + 1)
    }
  }

  for (let i = 0; i < length; i++) {
    if (marks[i] === 'G') continue
    const left = remaining.get(guess[i]) ?? 0
    if (left > 0) {
      marks[i] = 'Y'
      remaining.set(guess[i], left - 1)
    }
  }

  return marks.join('')
}

/** Words from `words` that would have produced `guess.key` for `guess.word`. */
export function filterByGuess(guess: Guess, words: string[]): string[] {
  return words.filter((candidate) => evaluate(guess.word, candidate) === guess.key)
}

/** Narrow `words` down by every guess in turn. */
export function applyGuesses(words: string[], guesses: Guess[]): string[] {
  let remaining = words
  for (const guess of guesses) {
    remaining = filterByGuess(guess, remaining)
    if (remaining.length <= 1) break
  }
  return remaining
}

/** Words still possible *before* the guess at `index` was played. */
export function wordsBeforeGuess(words: string[], guesses: Guess[], index: number): string[] {
  return applyGuesses(words, guesses.slice(0, index))
}

/** Group `words` by the key `guess` would produce against each of them. */
export function groupByKey(guess: string, words: string[]): Map<string, string[]> {
  const bins = new Map<string, string[]>()
  for (const answer of words) {
    const key = evaluate(guess, answer)
    const bin = bins.get(key)
    if (bin) bin.push(answer)
    else bins.set(key, [answer])
  }
  return bins
}

/** Size of each group `guess` splits `words` into, largest first. */
export function binSizes(guess: string, words: string[]): number[] {
  const counts = new Map<string, number>()
  for (const answer of words) {
    const key = evaluate(guess, answer)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return [...counts.values()].sort((a, b) => b - a)
}

export type LetterState = 'G' | 'Y' | '-'

/** Best known state of each letter across guesses (green beats yellow beats grey). */
export function letterStates(guesses: Guess[]): Map<string, LetterState> {
  const rank: Record<LetterState, number> = { '-': 0, Y: 1, G: 2 }
  const states = new Map<string, LetterState>()
  for (const { word, key } of guesses) {
    for (let i = 0; i < word.length; i++) {
      const mark = (key[i] === 'G' || key[i] === 'Y' ? key[i] : '-') as LetterState
      const previous = states.get(word[i])
      if (previous === undefined || rank[mark] > rank[previous]) states.set(word[i], mark)
    }
  }
  return states
}
