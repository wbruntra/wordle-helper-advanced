import { applyGuesses, binSizes, groupByKey, normalizeKey, type Guess } from '@wordle/shared'

export interface GuessAnalysis {
  patterns: number
  avgBinSize: number
  minBinSize: number
  maxBinSize: number
  /** Expected information from the guess, in bits. Higher is better. */
  bits: number
}

export interface TurnAnalysis {
  remainingBefore: number
  played: GuessAnalysis
  /** `null` when the best move couldn't be computed. */
  best: { word: string; analysis: GuessAnalysis } | null
  /** Expected guesses to finish from here (this guess included), or `null` without a best move. */
  expectedGuesses: { played: number; best: number } | null
  /** Why `best` is `null`, or a note about how it was found. */
  note: string | null
}

const MAX_WORDS_FOR_BEST = 2000

/** Shannon entropy of the pattern distribution, in bits: how much a guess is expected to narrow things down. */
export function entropyBits(sizes: number[]): number {
  const total = sizes.reduce((sum, size) => sum + size, 0)
  return -sizes.reduce((sum, size) => sum + (size / total) * Math.log2(size / total), 0)
}

export function analyzeGuess(guess: string, remaining: string[]): GuessAnalysis {
  const sizes = binSizes(guess, remaining)
  return {
    patterns: sizes.length,
    avgBinSize: remaining.length / sizes.length,
    minBinSize: Math.min(...sizes),
    maxBinSize: Math.max(...sizes),
    bits: entropyBits(sizes),
  }
}

/** The highest-information guess among `remaining`. */
function findBestGuess(remaining: string[]): {
  word: string
  analysis: GuessAnalysis
  note: string
} {
  if (remaining.length === 1) {
    return {
      word: remaining[0],
      analysis: analyzeGuess(remaining[0], remaining),
      note: 'Only one word remaining',
    }
  }

  let best: { word: string; analysis: GuessAnalysis } | null = null
  for (const word of remaining) {
    const analysis = analyzeGuess(word, remaining)
    if (!best || analysis.bits > best.analysis.bits) best = { word, analysis }
  }

  return { ...best!, note: '' }
}

/**
 * Expected number of guesses to finish, counting `guess` itself, assuming the
 * answer is uniformly one of `remaining` and every later guess is the greedy
 * best (highest-information) remaining word.
 */
export function expectedGuesses(guess: string, remaining: string[]): number {
  let later = 0
  for (const bin of groupByKey(guess, remaining).values()) {
    if (bin.length === 1 && bin[0] === guess) continue
    later += (bin.length / remaining.length) * expectedGuesses(findBestGuess(bin).word, bin)
  }
  return 1 + later
}

/** How the guess at `index` compares with the best available move at that point. */
export function analyzeTurn(words: string[], guesses: Guess[], index: number): TurnAnalysis {
  const remaining = applyGuesses(words, guesses.slice(0, index))
  const guess = guesses[index]
  const played = analyzeGuess(guess.word, remaining)

  if (remaining.length > MAX_WORDS_FOR_BEST) {
    return {
      remainingBefore: remaining.length,
      played,
      best: null,
      expectedGuesses: null,
      note: `Too many possibilities (${remaining.length.toLocaleString()}) to find the best move.`,
    }
  }

  const { word, analysis, note } = findBestGuess(remaining)
  return {
    remainingBefore: remaining.length,
    played,
    best: { word, analysis },
    expectedGuesses: {
      played: expectedGuesses(guess.word, remaining),
      best: expectedGuesses(word, remaining),
    },
    note: note || null,
  }
}

/** Words grouped by the pattern `guess` produces, largest group first. */
export function binsForGuess(guess: string, remaining: string[]) {
  return [...groupByKey(guess, remaining)]
    .map(([key, words]) => ({ key: normalizeKey(key), words }))
    .sort((a, b) => b.words.length - a.words.length)
}

export type Bin = ReturnType<typeof binsForGuess>[number]
