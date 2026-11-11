import { binSizes } from '@wordle/shared'

export interface RankedWord {
  word: string
  /** Distinct colour patterns the word can produce against the remaining words. */
  patterns: number
}

/**
 * Rank candidate guesses by how many distinct patterns they split `remaining`
 * into. With N remaining words, `patterns / N` is the chance of finishing within
 * two guesses when playing the word and then picking within the resulting group.
 *
 * Candidates are the remaining words themselves unless `includeAllWords` is set
 * *and* no remaining word separates all the others, in which case any word from
 * `allWords` may be suggested as a "helper".
 */
export function rankGuesses(
  remaining: string[],
  allWords: string[],
  includeAllWords: boolean,
): RankedWord[] {
  const score = (word: string): RankedWord => ({
    word,
    patterns: binSizes(word, remaining).length,
  })
  const byPatterns = (a: RankedWord, b: RankedWord) => b.patterns - a.patterns

  const fromRemaining = remaining.map(score).sort(byPatterns)
  const separatesEverything = fromRemaining[0]?.patterns === remaining.length
  if (!includeAllWords || separatesEverything) return fromRemaining

  return allWords.map(score).sort(byPatterns)
}
