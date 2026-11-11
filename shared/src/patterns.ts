/**
 * Allocation-free pattern evaluation for hot loops.
 *
 * Words are packed into a flat `Uint8Array` of letter codes (0–25, five per
 * word) and the colours a guess receives are encoded as a base-3 integer, one
 * digit per letter (`-` = 0, `Y` = 1, `G` = 2, first letter least significant).
 * This gives the same answers as `evaluate` but without building strings, maps
 * or arrays, which makes it suitable for scoring every guess against every
 * possible answer.
 */
import { WORD_LENGTH } from './constants'

/** Number of distinct patterns: 3 colours for each of 5 letters. */
export const PATTERN_COUNT = 3 ** WORD_LENGTH

const A = 'A'.charCodeAt(0)
const GREEN = 2
const YELLOW = 1
const PLACE = Array.from({ length: WORD_LENGTH }, (_, i) => 3 ** i)

/** Pack uppercase words into letter codes, `WORD_LENGTH` per word. */
export function packWords(words: readonly string[]): Uint8Array {
  const packed = new Uint8Array(words.length * WORD_LENGTH)
  words.forEach((word, w) => {
    for (let i = 0; i < WORD_LENGTH; i++) packed[w * WORD_LENGTH + i] = word.charCodeAt(i) - A
  })
  return packed
}

// Unmatched answer letters, indexed by letter code. Always returned to zero.
const unmatched = new Uint8Array(26)

/**
 * The pattern guess number `g` in `guesses` receives against answer number `a`
 * in `answers` (both packed with `packWords`).
 */
export function patternIndex(
  guesses: Uint8Array,
  g: number,
  answers: Uint8Array,
  a: number,
): number {
  const gs = g * WORD_LENGTH
  const as = a * WORD_LENGTH
  let pattern = 0

  for (let i = 0; i < WORD_LENGTH; i++) {
    if (guesses[gs + i] === answers[as + i]) pattern += GREEN * PLACE[i]
    else unmatched[answers[as + i]]++
  }

  for (let i = 0; i < WORD_LENGTH; i++) {
    const letter = guesses[gs + i]
    if (letter !== answers[as + i] && unmatched[letter] > 0) {
      pattern += YELLOW * PLACE[i]
      unmatched[letter]--
    }
  }

  for (let i = 0; i < WORD_LENGTH; i++) unmatched[answers[as + i]] = 0
  return pattern
}

/** The `G`/`Y`/`-` key for a pattern index, matching `evaluate`. */
export function patternKey(pattern: number): string {
  let key = ''
  for (let i = 0; i < WORD_LENGTH; i++, pattern = Math.floor(pattern / 3))
    key += '-YG'[pattern % 3]
  return key
}

const ALPHABET = 26
// A letter's placement in a word: a bit per position it occupies, plus how many times it occurs.
const COUNT_SHIFT = WORD_LENGTH
const PLACEMENTS = 1 << (COUNT_SHIFT + 3)
const POSITION_SETS = 1 << WORD_LENGTH

const placementOf = (word: ArrayLike<number>, letter: number) => {
  let positions = 0
  let count = 0
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (word[i] === letter) {
      positions |= 1 << i
      count++
    }
  }
  return positions | (count << COUNT_SHIFT)
}

/**
 * `CONTRIBUTION[guessPositions * PLACEMENTS + answerPlacement]` is the part of
 * the pattern earned by one letter that sits at `guessPositions` in the guess,
 * given its placement in the answer: greens where both have it, then yellows,
 * left to right, for as many copies as the answer has left over.
 */
const CONTRIBUTION = (() => {
  const table = new Uint8Array(POSITION_SETS * PLACEMENTS)
  for (let guessPositions = 0; guessPositions < POSITION_SETS; guessPositions++) {
    for (let placement = 0; placement < PLACEMENTS; placement++) {
      const answerPositions = placement & (POSITION_SETS - 1)
      let spare = (placement >> COUNT_SHIFT) - popCount(guessPositions & answerPositions)
      let pattern = 0
      for (let i = 0; i < WORD_LENGTH; i++) {
        if (!(guessPositions & (1 << i))) continue
        if (answerPositions & (1 << i)) pattern += GREEN * PLACE[i]
        else if (spare-- > 0) pattern += YELLOW * PLACE[i]
      }
      table[guessPositions * PLACEMENTS + placement] = pattern
    }
  }
  return table
})()

function popCount(bits: number): number {
  let count = 0
  for (; bits; bits &= bits - 1) count++
  return count
}

/**
 * A fixed set of answers prepared for scoring many guesses against them.
 *
 * Each letter of a guess earns its colours independently of the guess's other
 * letters: they depend only on where the letter sits in the guess and where
 * (and how often) it sits in the answer. So the answers' placement of every
 * letter is tabulated up front, and a guess's pattern against an answer is the
 * sum of one `CONTRIBUTION` lookup per distinct letter. Placements are laid
 * out letter-major so the inner loop walks a few contiguous rows.
 */
export class AnswerSet {
  readonly size: number
  // `placements[letter * size + a]` is the letter's placement in answer a.
  private readonly placements: Uint8Array
  // `seen[p] === stamp` marks pattern p as produced by the guess being counted.
  private readonly seen = new Uint32Array(PATTERN_COUNT)
  private stamp = 0

  constructor(answers: readonly string[]) {
    this.size = answers.length
    const packed = packWords(answers)
    this.placements = new Uint8Array(ALPHABET * this.size)
    for (let a = 0; a < this.size; a++) {
      const word = packed.subarray(a * WORD_LENGTH, (a + 1) * WORD_LENGTH)
      for (const letter of word)
        this.placements[letter * this.size + a] = placementOf(word, letter)
    }
  }

  /**
   * How many distinct patterns guess number `g` of `guesses` (packed) produces
   * across these answers, or `null` as soon as it's clear it can't reach
   * `minimum`. Each answer adds at most one new pattern, which bounds what the
   * answers not yet checked can contribute.
   */
  distinctPatterns(guesses: Uint8Array, g: number, minimum = 0): number | null {
    const { size, placements, seen } = this
    const contribution = CONTRIBUTION
    if (minimum > Math.min(size, PATTERN_COUNT)) return null
    const stamp = ++this.stamp

    // Row starts for each letter of the guess, padded to five with a letter at
    // no positions (whose contribution row is all zero).
    const guess = guesses.subarray(g * WORD_LENGTH, (g + 1) * WORD_LENGTH)
    const rows: number[] = []
    const contributions: number[] = []
    for (let i = 0; i < WORD_LENGTH; i++) {
      if (guess.indexOf(guess[i]) !== i) continue
      rows.push(guess[i] * size)
      contributions.push(placementOf(guess, guess[i]) & (POSITION_SETS - 1))
    }
    while (rows.length < WORD_LENGTH) {
      rows.push(0)
      contributions.push(0)
    }
    const [r0, r1, r2, r3, r4] = rows
    const [c0, c1, c2, c3, c4] = contributions.map((positions) => positions * PLACEMENTS)

    return countDistinct(
      placements,
      contribution,
      seen,
      stamp,
      size,
      minimum,
      r0,
      r1,
      r2,
      r3,
      r4,
      c0,
      c1,
      c2,
      c3,
      c4,
    )
  }
}

/** The hot loop of `AnswerSet.distinctPatterns`, kept monomorphic and free of property lookups. */
function countDistinct(
  placements: Uint8Array,
  contribution: Uint8Array,
  seen: Uint32Array,
  stamp: number,
  size: number,
  minimum: number,
  r0: number,
  r1: number,
  r2: number,
  r3: number,
  r4: number,
  c0: number,
  c1: number,
  c2: number,
  c3: number,
  c4: number,
): number | null {
  let distinct = 0
  for (let a = 0; a < size; a++) {
    if (distinct + size - a < minimum) return null
    const pattern =
      contribution[c0 + placements[r0 + a]] +
      contribution[c1 + placements[r1 + a]] +
      contribution[c2 + placements[r2 + a]] +
      contribution[c3 + placements[r3 + a]] +
      contribution[c4 + placements[r4 + a]]
    if (seen[pattern] !== stamp) {
      seen[pattern] = stamp
      distinct++
    }
  }
  return distinct < minimum ? null : distinct
}
