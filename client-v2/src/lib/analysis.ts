import { applyGuesses, binSizes, groupByKey, normalizeKey, type Guess } from '@wordle/shared'

export interface GuessAnalysis {
  patterns: number
  avgBinSize: number
  minBinSize: number
  maxBinSize: number
  /** Higher is better: rewards many patterns and an even spread. */
  score: number
}

export interface TurnAnalysis {
  remainingBefore: number
  played: GuessAnalysis
  /** `null` when the best move couldn't be computed. */
  best: { word: string; analysis: GuessAnalysis } | null
  /** Why `best` is `null`, or a note about how it was found. */
  note: string | null
}

const MAX_WORDS_FOR_BEST = 2000
const MAX_BEST_CANDIDATES = 900

/** Rewards many patterns, penalises an uneven spread of words across them. */
export function scoreBins(sizes: number[]): number {
  const n = sizes.length
  const mean = sizes.reduce((sum, size) => sum + size, 0) / n
  const stdDev = Math.sqrt(sizes.reduce((sum, size) => sum + (size - mean) ** 2, 0) / n)
  return n * 10 - stdDev
}

export function analyzeGuess(guess: string, remaining: string[]): GuessAnalysis {
  const sizes = binSizes(guess, remaining)
  return {
    patterns: sizes.length,
    avgBinSize: remaining.length / sizes.length,
    minBinSize: Math.min(...sizes),
    maxBinSize: Math.max(...sizes),
    score: scoreBins(sizes),
  }
}

function sample<T>(items: T[], count: number): T[] {
  const copy = items.slice()
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy.slice(0, count)
}

/** The best-scoring guess among (a sample of) `remaining`. */
function findBestGuess(remaining: string[]): { word: string; analysis: GuessAnalysis; note: string } {
  if (remaining.length === 1) {
    return { word: remaining[0], analysis: analyzeGuess(remaining[0], remaining), note: 'Only one word remaining' }
  }

  const limited = remaining.length > MAX_BEST_CANDIDATES
  const candidates = limited ? sample(remaining, MAX_BEST_CANDIDATES) : remaining

  let best: { word: string; analysis: GuessAnalysis } | null = null
  for (const word of candidates) {
    const analysis = analyzeGuess(word, remaining)
    if (!best || analysis.score > best.analysis.score) best = { word, analysis }
  }

  return {
    ...best!,
    note: limited ? `Checked ${candidates.length} of ${remaining.length} possible words` : '',
  }
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
      note: `Too many possibilities (${remaining.length.toLocaleString()}) to find the best move.`,
    }
  }

  const { word, analysis, note } = findBestGuess(remaining)
  return { remainingBefore: remaining.length, played, best: { word, analysis }, note: note || null }
}

/** Words grouped by the pattern `guess` produces, largest group first. */
export function binsForGuess(guess: string, remaining: string[]) {
  return [...groupByKey(guess, remaining)]
    .map(([key, words]) => ({ key: normalizeKey(key), words }))
    .sort((a, b) => b.words.length - a.words.length)
}

export type Bin = ReturnType<typeof binsForGuess>[number]
