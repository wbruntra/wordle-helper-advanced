import _ from 'lodash'

// Type definitions
interface AccentsMap {
  [key: string]: string
}

interface GuessResult {
  word: string
  key: string
}

interface ClassifiedResult {
  word: string
  filtered: string[]
  key: string
}

interface GuessAnalysis {
  binsCount: number
  binSizes: number[]
  avgBinSize: number
  minBinSize: number
  maxBinSize: number
  distributionScore: number
  actualEvaluationCount?: number
  actualEvaluationWords?: string[]
  binBreakdown?: BinBreakdown[]
}

interface BinBreakdown {
  evaluation: string
  count: number
  words?: string[]
}

interface OptimalGuess {
  word: string | null
  analysis: GuessAnalysis | null
  reason?: string
  score?: number
}

interface GuessComparison {
  userBinsCount: number
  optimalBinsCount: number | null
  userAvgBinSize: number
  optimalAvgBinSize: number | null
  binsAdvantage: number | null
  distributionScore: {
    user: number
    optimal: number | null
  }
  optimalUnavailableReason?: string
}

interface GuessComparisonResult {
  filteredWordListSize: number
  userGuess: {
    word: string
    key: string
    analysis: GuessAnalysis
  }
  optimalGuess: OptimalGuess[]
  comparison: GuessComparison
}

interface FindOptimalOptions {
  maxCandidates?: number
  candidateStrategy?: 'first' | 'sample' | 'all'
}

interface CompareGuessOptions {
  maxWordListForOptimal?: number
  maxOptimalCandidates?: number
  candidateStrategy?: 'first' | 'sample' | 'all'
}

interface ReclassifyOptions {
  stop_after_one?: boolean
}

interface GetBinsOptions {
  returnObject?: boolean
  showMatches?: boolean
}

// Constants
const accents: AccentsMap = {
  Á: 'A',
  É: 'E',
  Í: 'I',
  Ó: 'O',
  Ú: 'U',
  Ü: 'U',
}

/**
 * Returns a canonical form of the input string `s`. If `removeAccents` is true, it also replaces accented characters with their plain vowel counterparts.
 *
 * @param {string} s - The input string to be processed.
 * @param {boolean} [removeAccents=false] - Optional parameter that determines whether to replace accented characters with their plain vowel counterparts.
 * @returns {string} The canonical form of the input string.
 */
export const getCanonical = (s: string, removeAccents: boolean = false): string => {
  let canonical = s.trim()
  if (removeAccents) {
    const accentRegex = /[ÁÉÍÓÚÜ]/g
    canonical = canonical.replace(accentRegex, (match) => accents[match])
  }

  return canonical.toUpperCase()
}

/**
 * Returns a canonical form of the user-input string `s`, where all characters are uppercased and chararacters other than 'Y' and 'G' are replaced with a hyphen.
 * @param {string} key
 */
export const getCanonicalKey = (key: string): string => {
  return key.toUpperCase().trim().replace(/[^YG]/g, '-')
}

/**
 * Get all words that produce given key from guess
 * @param {string} guess - The guessed word
 * @param {string} key - The returned key
 * @param {string[]} wordList
 */
export const getAnswersMatchingKey = (guess: string, key: string, wordList: string[]): string[] => {
  const canonicalKey = getCanonicalKey(key)
  const result = wordList.filter((word) => {
    const tempKey = evaluateToString(guess, word)
    return canonicalKey === tempKey
  })
  return result
}

export const guessReverser = (answer: string, key: string, wordList: string[]): string[] => {
  const canonicalKey = getCanonicalKey(key)
  const result = wordList.filter((word) => {
    const tempKey = evaluateToString(word, answer)
    return canonicalKey === tempKey
  })
  return result
}

// New helper function for direct evaluation (avoids creating functions)
const evaluateGuess = (canonicalGuess: string, canonicalAnswer: string): string => {
  const key = Array(canonicalGuess.length).fill(null)
  const answerArray = canonicalAnswer.split('')
  const guessArray = canonicalGuess.split('')

  // First pass: correct positions (GREEN)
  for (let i = 0; i < guessArray.length; i++) {
    if (guessArray[i] === answerArray[i]) {
      key[i] = 'G'
      answerArray[i] = '-' // Mark as used
    }
  }

  // Second pass: wrong positions (YELLOW) or absent (BLACK)
  for (let i = 0; i < guessArray.length; i++) {
    if (key[i] === 'G') continue
    const idx = answerArray.indexOf(guessArray[i])
    if (idx !== -1) {
      key[i] = 'Y'
      answerArray[idx] = '-' // Mark as used
    } else {
      key[i] = '-'
    }
  }

  return key.join('')
}

/**
 * Return evaluation key (e.g. `YG--Y`) for given `guess` and `answer`
 * @param {string} guess - Guessed word
 * @param {string} answer - Correct answer
 */
export const evaluateToString = (guess: string, answer: string): string => {
  const canonicalGuess = getCanonical(guess)
  const canonicalAnswer = getCanonical(answer)
  return evaluateGuess(canonicalGuess, canonicalAnswer)
}

/**
 * Given the correct `answer`, this function returns an evaluator function.
 * The evaluator function takes a `guess` and returns a key that indicates how close the guess is to the answer.
 * Each character in the key corresponds to a character in the guess:
 * - 'G' means the character is correct and in the correct position (Green).
 * - 'Y' means the character is correct but in the wrong position (Yellow).
 * - '-' means the character is not in the answer (Black).
 *
 * @param {string} answer - The correct answer.
 * @returns {function} evaluator - A function that takes a guess and returns a key indicating how close the guess is to the answer.
 */
export const createEvaluator = (answer: string): ((guess: string) => string) => {
  /**
   * This function evaluates a guess against a predefined answer. It returns a string
   * where each character represents the evaluation of the corresponding character in the guess:
   * 'G' for a correct character in the correct position (GREEN),
   * 'Y' for a correct character in the wrong position (YELLOW),
   * '-' for an incorrect character (BLACK).
   *
   * @param {string} guess - The guess input to the function.
   * @returns {string} A string representing the evaluation of the guess.
   * @example
   *    const result = evaluator('some guess');
   */
  const evaluator = (guess: string): string => {
    const key = Array(guess.length).fill(null)
    const answerArray = getCanonical(answer).split('')
    const guessArray = getCanonical(guess).split('')

    // First pass: only get correct (GREEN) letters
    for (let i = 0; i < guessArray.length; i++) {
      if (guessArray[i] === answerArray[i]) {
        key[i] = 'G'
        answerArray[i] = '-'
      }
    }

    // Second pass: distinguish YELLOW from BLACK letters
    for (let i = 0; i < guessArray.length; i++) {
      if (key[i] === 'G') {
        continue
      }
      if (answerArray.indexOf(guessArray[i]) !== -1) {
        key[i] = 'Y'
        answerArray[answerArray.indexOf(guessArray[i])] = '-'
      } else {
        key[i] = '-'
      }
    }

    return key.join('')
  }

  return evaluator
}

export const compareEvaluations = (answer: string, guess1: string, guess2: string): boolean => {
  const evaluator = createEvaluator(answer)
  return evaluator(guess1) === evaluator(guess2)
}

/**
 * Filters a list of words based on the evaluation of a guess.
 *
 * This function takes a guess object and a list of words. For each word in the list, it creates an evaluator
 * using the word as the potential answer. It then uses this evaluator to evaluate the guessed word. If the
 * evaluation matches the key in the guess object, the word is included in the returned list.
 *
 * @param {Object} guess - An object containing the guessed word and its evaluation.
 * @param {string} guess.word - The word that was guessed.
 * @param {string} guess.key - The evaluation of the guessed word, e.g. '..YYG'.
 * @param {string[]} wordList - The list of words to filter.
 * @returns {string[]} A list of words from `wordList` that match the evaluation of `guess`.
 */
export const filterWordsUsingGuessResult = (guess: GuessResult, wordList: string[]): string[] => {
  const result = wordList.filter((potentialAnswer) => {
    // For each potential answer, determine whether the guess would produce the same evaluation
    const evaluator = createEvaluator(potentialAnswer)
    const potentialKey = evaluator(guess.word)
    return potentialKey === guess.key
  })
  return result
}

/**
 * Get all possible evaluations (keys) from comparing `word` against `wordList`
 * @param {string} word
 * @param {string[]} wordList
 */
export const getPossibleKeys = (word: string, wordList: string[]): string[] => {
  const result = wordList.map((answer) => {
    return evaluateToString(word, answer)
  })
  return _.uniq(result).sort()
}

/**
 * Groups potential answers from a word list by their evaluation outcome when compared to a given guess word.
 *
 * This function simulates how the guess would perform against each possible answer, categorizing answers
 * into "bins" based on the resulting evaluation string (e.g., "YG--Y"). Each bin represents a unique pattern
 * of correct/incorrect letters and positions.
 *
 * - If `showMatches` is false (default), each bin's value is the number of answers that produce that pattern.
 * - If `showMatches` is true, each bin's value is an array of the actual answers that produce that pattern.
 *
 * This helps measure guess quality: an ideal guess has many small bins (unique patterns), while a poor guess
 * has few large bins (many answers share the same pattern).
 *
 * By default, returns a sorted array of bin sizes (counts) in descending order. If `returnObject` is true,
 * returns the full bin object instead.
 *
 * @param {string} word - The guess word to evaluate against the word list.
 * @param {string[]} wordList - Array of possible answers to categorize.
 * @param {Object} [options] - Configuration options.
 * @param {boolean} [options.returnObject=false] - If true, return the bin object; otherwise, return sorted counts.
 * @param {boolean} [options.showMatches=false] - If true, bin values are arrays of matching words; otherwise, counts.
 *
 * @returns {Object|number[]} The bin object (if `returnObject` is true) or a sorted array of bin counts (descending).
 */
export const getBins = (
  word: string,
  wordList: string[],
  { returnObject = false, showMatches = false }: GetBinsOptions = {}
): Record<string, number | string[]> | number[] => {
  const comparisonResults: Record<string, number | string[]> = {}
  for (const answer of wordList) {
    const comparisonOutcome = evaluateToString(word, answer)
    if (comparisonResults[comparisonOutcome]) {
      if (showMatches) {
        (comparisonResults[comparisonOutcome] as string[]).push(answer)
      } else {
        comparisonResults[comparisonOutcome] = (comparisonResults[comparisonOutcome] as number) + 1
      }
    } else {
      comparisonResults[comparisonOutcome] = showMatches ? [answer] : 1
    }
  }
  if (returnObject) {
    return comparisonResults
  }
  return Object.values(comparisonResults).map(value => 
    Array.isArray(value) ? value.length : value
  ).sort((a, b) => b - a)
}

export const getProportionOfWordsInBinsBelowLimit = (bins: number[], limit: number): number => {
  const totalWords = _.sum(bins)
  const filteredBins = bins.filter((size) => size < limit)
  const lessThanLimitWords = _.sum(filteredBins)
  return lessThanLimitWords / totalWords
}

export const reclassifyAllForAnswer = (
  answer: string,
  wordList: string[],
  { stop_after_one = false }: ReclassifyOptions = {}
): ClassifiedResult[] => {
  let results: ClassifiedResult[] = []
  for (const guess of wordList) {
    if (guess === answer) {
      continue
    }
    const key = evaluateToString(guess, answer)
    const filtered = filterWordsUsingGuessResult(
      {
        word: guess,
        key,
      },
      wordList,
    )
    if (stop_after_one && filtered.length === 1) {
      return [
        {
          word: guess,
          filtered,
          key,
        },
      ]
    }
    results.push({
      word: guess,
      filtered,
      key,
    })
  }

  results = results.filter((a) => a.filtered.length === 1)
  results = _.orderBy(results, (a) => a.filtered.length, 'asc')
  return results
}

export const isGuessableInOne = (answer: string, wordList: string[]): boolean => {
  let classifiedKeys = reclassifyAllForAnswer(answer, wordList, { stop_after_one: true })
  let result = classifiedKeys.filter((r) => r.filtered.length === 1)
  console.log(answer, result[0])
  return result.length > 0
}

/**
 * Applies a series of guesses to filter down a word list to remaining possible answers.
 *
 * This function takes an initial word list and progressively filters it by applying each guess
 * and its evaluation result. Each guess narrows down the possible answers by eliminating words
 * that wouldn't produce the same evaluation pattern.
 *
 * @param {string[]} wordList - The initial list of possible words to filter
 * @param {Object[]} guesses - Array of guess objects, each containing:
 * @param {string} guesses[].word - The guessed word
 * @param {string} guesses[].key - The evaluation key (e.g., "YG--Y") for that guess
 * @returns {string[]} The filtered list of words that are still possible after applying all guesses
 *
 * @example
 * const guesses = [
 *   { word: 'CRATE', key: '-Y-Y-' },
 *   { word: 'TORUS', key: 'YGGGY' }
 * ];
 * const remainingWords = applyGuesses(wordList, guesses);
 * // Returns only words that would produce '-Y-Y-' for CRATE and 'YGGGY' for TORUS
 */
export const applyGuesses = (wordList: string[], guesses: GuessResult[]): string[] => {
  let filteredWords = wordList.slice()
  for (const guess of guesses) {
    filteredWords = filterWordsUsingGuessResult(guess, filteredWords)

    // If we have narrowed the list to one word, we can return early
    if (filteredWords.length === 1) {
      return filteredWords
    }
  }

  return filteredWords
}

export function decompress(text: string): string[] {
  let lastword = 'zzzzz'
  let words: string[] = []
  let i = 0
  let j = 0
  let word: string
  while (j <= text.length) {
    if ((text.charCodeAt(j) < 96 || j === text.length) && j > i) {
      word = (lastword.slice(0, 5 - (j - i)) + text.slice(i, j)).toLowerCase()
      words.push(word)
      lastword = word
      i = j
    }
    j++
  }
  return words.map((w) => w.toUpperCase())
}

/**
 * @param {string[]} guessList - List of guessed words
 * @param {string} word
 */

export const getNewLetterCountInWord = (usedLetters: string, word: string): number => {
  const usedLettersArray = usedLetters.split('')
  const result = word.split('').filter((letter) => {
    const result = !usedLettersArray.includes(letter)
    if (result) {
      usedLettersArray.push(letter)
    }
    return result
  })
  return result.length
}

/**
 * @param {string[]} guesses - List of guessed words
 * @param {string} answer
 */

export const guessesIdentifyAnswer = (guesses: string[], answer: string, wordList: string[]): boolean => {
  const guessList = guesses.map((guess) => {
    return {
      word: guess.toUpperCase(),
      key: evaluateToString(guess, answer),
    }
  })

  const remaining = applyGuesses(wordList, guessList)

  return remaining.length === 1
}

export const getPercentageIdentified = (guesses: string[], wordList: string[]): { identified: number; total: number; percentage: number } => {
  let identified = 0

  for (const answer of wordList) {
    if (guessesIdentifyAnswer(guesses, answer, wordList)) {
      identified++
    }
  }

  return {
    identified,
    total: wordList.length,
    percentage: (identified / wordList.length) * 100,
  }
}

/**
 * Determine if `guess` will identify the solution among `wordList`
 */
export const solutionGuaranteed = (guess: string, wordList: string[]): boolean => {
  const evaluations: string[] = []
  for (const answer of wordList) {
    const evaluation = evaluateToString(guess, answer)
    if (evaluations.includes(evaluation)) {
      return false
    } else {
      evaluations.push(evaluation)
    }
  }
  return true
}

export const getGuessesWithKeys = (guesses: string[], answer: string): GuessResult[] => {
  const result: GuessResult[] = []
  for (const guess of guesses) {
    const ev = {
      word: guess,
      key: evaluateToString(guess, answer),
    }
    result.push(ev)
  }
  return result
}

/**
 * Calculates the score for a given array based on its length and the standard deviation of its elements.
 * The score is higher when the array is longer and its elements are more evenly distributed.
 *
 * @param {number[]} arr - The array to be scored.
 * @returns {number} The calculated score.
 */
export function scoreBinDistribution(arr: number[]): number {
  const n = arr.length

  // Calculate mean.
  const mean = arr.reduce((sum, val) => sum + val, 0) / n

  // Calculate standard deviation.
  const stdDev = Math.sqrt(arr.reduce((sq, val) => sq + Math.pow(val - mean, 2), 0) / n)

  // Calculate score. We subtract the stdDev from the length to prioritize both length and even distribution.
  // Since stdDev is always positive, a smaller stdDev (more evenly distributed array) will result in a higher score.
  // The factor 10 is used to scale up the effect of length on the final score.
  const score = n * 10 - stdDev

  return score
}

/**
 * Compares a user's guess with the optimal guess for a given game state
 * @param {string[]} guessHistory - Array of guesses made so far (in order)
 * @param {string[]} keyHistory - Array of corresponding evaluation keys
 * @param {string} answer - The correct answer (for filtering word list)
 * @param {string[]} wordList - The full list of possible words
 * @returns {Object} Analysis comparing the user's guess with the optimal guess
 */
export const compareGuessWithOptimal = (
  guessHistory: string[],
  keyHistory: string[],
  answer: string,
  wordList: string[],
  options: CompareGuessOptions = {},
): GuessComparisonResult => {
  if (guessHistory.length === 0 || guessHistory.length !== keyHistory.length) {
    throw new Error('Guess history and key history must have matching lengths and not be empty')
  }

  const {
    maxWordListForOptimal = 2000,
    maxOptimalCandidates = 900,
    candidateStrategy = 'sample',
  } = options

  // Filter word list to get the remaining possible words before the last guess
  const guessesSoFar = guessHistory.slice(0, -1).map((word, index) => ({
    word,
    key: keyHistory[index],
  }))

  const filteredWordList = applyGuesses(wordList, guessesSoFar)

  // Get the user's last guess and its evaluation
  const userGuess = guessHistory[guessHistory.length - 1]
  const userKey = keyHistory[keyHistory.length - 1]

  // Analyze the user's guess
  const userGuessAnalysis = analyzeGuess(userGuess, userKey, filteredWordList)

  // Find the optimal guess(es) for this state
  let optimalGuesses: OptimalGuess[]
  let optimalAnalysis: GuessAnalysis | null = null
  let optimalReason: string | null = null

  if (filteredWordList.length > maxWordListForOptimal) {
    optimalReason = `Optimal guess skipped: ${filteredWordList.length} possibilities exceed limit of ${maxWordListForOptimal}`
    optimalGuesses = [
      {
        word: null,
        analysis: null,
        reason: optimalReason,
      },
    ]
  } else {
    optimalGuesses = findOptimalGuesses(filteredWordList, 1, {
      maxCandidates: maxOptimalCandidates,
      candidateStrategy,
    })
    optimalAnalysis = optimalGuesses[0]?.analysis ?? null
    optimalReason = optimalGuesses[0]?.reason ?? null
  }

  const comparison: GuessComparison = {
    userBinsCount: userGuessAnalysis.binsCount,
    optimalBinsCount: optimalAnalysis ? optimalAnalysis.binsCount : null,
    userAvgBinSize: userGuessAnalysis.avgBinSize,
    optimalAvgBinSize: optimalAnalysis ? optimalAnalysis.avgBinSize : null,
    binsAdvantage: optimalAnalysis
      ? optimalAnalysis.binsCount - userGuessAnalysis.binsCount
      : null,
    distributionScore: {
      user: userGuessAnalysis.distributionScore,
      optimal: optimalAnalysis ? optimalAnalysis.distributionScore : null,
    },
  }

  if (!optimalAnalysis && optimalReason) {
    comparison.optimalUnavailableReason = optimalReason
  }

  return {
    filteredWordListSize: filteredWordList.length,
    userGuess: {
      word: userGuess,
      key: userKey,
      analysis: userGuessAnalysis,
    },
    optimalGuess: optimalGuesses,
    comparison,
  }
}

/**
 * Analyzes how well a guess performs against a list of remaining possible words.
 *
 * This function simulates using the given guess against each word in the remaining word list,
 * categorizing the results into "bins" based on the evaluation patterns (e.g., "YG--Y", "-Y-Y-").
 * Each bin represents a unique evaluation outcome, and the analysis provides metrics about
 * how evenly the guess distributes the remaining possibilities.
 *
 * A good guess creates many small bins (high information gain), while a poor guess creates
 * few large bins (low information gain).
 *
 * @param {string} guess - The word being analyzed as a potential guess
 * @param {string} [key] - Optional evaluation key (e.g., "YG--Y") to highlight the actual outcome
 * @param {string[]} remainingWords - List of possible answers to analyze against
 * @returns {Object} Comprehensive analysis of the guess's performance with properties:
 *   - binsCount: Number of unique evaluation patterns created
 *   - binSizes: Array of bin sizes (number of words per evaluation pattern)
 *   - avgBinSize: Average number of words per bin
 *   - minBinSize: Size of the smallest bin
 *   - maxBinSize: Size of the largest bin
 *   - distributionScore: Quality score (higher = better distribution)
 *   - actualEvaluationCount: (if key provided) Number of words that produce the given evaluation
 *   - actualEvaluationWords: (if key provided & <100 words) Array of words producing the evaluation
 *   - binBreakdown: (if <100 words) Detailed breakdown of each evaluation pattern
 *
 * @example
 * const analysis = analyzeGuess('CRATE', '-Y-Y-', ['STORK', 'STORE', 'STORM']);
 * // Returns analysis showing how 'CRATE' distributes the remaining words
 * // into different evaluation categories, with metrics about distribution quality
 */
export const analyzeGuess = (guess: string, key: string | null, remainingWords: string[]): GuessAnalysis => {
  const includeMatches = remainingWords.length < 100
  const bins = getBins(guess, remainingWords, {
    returnObject: true,
    showMatches: includeMatches,
  }) as Record<string, number | string[]>

  const binSizes = Object.values(bins).map((value) =>
    Array.isArray(value) ? value.length : value,
  )

  const analysis: GuessAnalysis = {
    binsCount: Object.keys(bins).length,
    binSizes,
    avgBinSize: _.mean(binSizes),
    minBinSize: _.min(binSizes) || 0,
    maxBinSize: _.max(binSizes) || 0,
    distributionScore: scoreBinDistribution(binSizes),
  }

  if (key) {
    const canonicalKey = getCanonicalKey(key)
    const binValue = bins[canonicalKey]
    if (binValue !== undefined) {
      analysis.actualEvaluationCount = Array.isArray(binValue) ? binValue.length : binValue
      if (Array.isArray(binValue)) {
        analysis.actualEvaluationWords = binValue
      }
    }
  }

  // Only include detailed bin breakdown if filtered words < 100
  if (includeMatches) {
    analysis.binBreakdown = Object.entries(bins).map(([evaluation, words]) => ({
      evaluation,
      count: Array.isArray(words) ? words.length : words as number,
      words: Array.isArray(words) ? words : undefined,
    }))
  }

  return analysis
}

/**
 * Finds the optimal guess(es) for a given word list
 * Returns top candidates based on bin distribution
 * @param {string[]} wordList - Remaining possible words
 * @param {number} topN - Number of top candidates to return
 * @returns {Array} Array of optimal guesses with their analysis
 */
export const findOptimalGuesses = (wordList: string[], topN: number = 1, options: FindOptimalOptions = {}): OptimalGuess[] => {
  const { maxCandidates = Infinity, candidateStrategy = 'sample' } = options

  if (wordList.length === 1) {
    return [
      {
        word: wordList[0],
        analysis: {
          binsCount: 1,
          binSizes: [1],
          avgBinSize: 1,
          minBinSize: 1,
          maxBinSize: 1,
          distributionScore: 1,
        },
        reason: 'Only one word remaining',
      },
    ]
  }

  let candidatePool = wordList
  let candidatePoolNote: string | null = null

  const shouldLimitCandidates = Number.isFinite(maxCandidates) && wordList.length > maxCandidates
  if (shouldLimitCandidates) {
    if (candidateStrategy === 'first') {
      candidatePool = wordList.slice(0, maxCandidates)
    } else if (candidateStrategy === 'sample') {
      candidatePool = _.sampleSize(wordList, maxCandidates)
    } else {
      candidatePool = wordList.slice(0, maxCandidates)
    }
    candidatePoolNote = `Analyzed ${candidatePool.length} of ${wordList.length} candidates`
  }

  // Score all remaining words
  const candidates = candidatePool.map((word) => {
    const analysis = analyzeGuess(word, null, wordList)
    return {
      word,
      analysis,
      score: analysis.distributionScore,
    }
  })

  // Sort by distribution score (descending) and return top N
  const sorted = _.orderBy(candidates, (c) => c.score, 'desc')

  return sorted.slice(0, topN).map((candidate) => ({
    word: candidate.word,
    analysis: candidate.analysis,
    reason: `Optimal distribution with score ${candidate.score.toFixed(2)}`.concat(
      candidatePoolNote ? `. ${candidatePoolNote}` : '',
    ),
  }))
}

export function compress(words: string[]): string {
  let lastword = 'zzzzz'
  let result = ''
  for (const word of words) {
    const wordLower = word.toLowerCase()
    let prefixLen = 0
    while (prefixLen < 5 && lastword[prefixLen] === wordLower[prefixLen]) {
      prefixLen++
    }
    const suffix = wordLower.slice(prefixLen)
    if (suffix.length > 0) {
      result += suffix[0].toUpperCase() + suffix.slice(1)
    }
    lastword = wordLower
  }
  return result
}

/**
 * @param {string[]} guessList - List of guessed words
 */
export function getUnusedLetters(guessList: string[]): string[] {
  const letters = 'abcdefghijklmnopqrstuvwxyz'.toUpperCase()
  const usedLetters = guessList.reduce((acc, guess) => {
    return acc + guess
  }, '')
  return letters.split('').filter((letter) => !usedLetters.includes(letter))
}