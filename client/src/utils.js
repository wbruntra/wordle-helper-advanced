import { miniMax, sumRoots, wordsAtOrBelowLimit } from './scorers'

import _ from 'lodash'
import md5 from 'md5'

/**
 * Returns a canonical form of the input string `s`. If `removeAccents` is true, it also replaces accented characters with their plain vowel counterparts.
 *
 * @param {string} s - The input string to be processed.
 * @param {boolean} [removeAccents=false] - Optional parameter that determines whether to replace accented characters with their plain vowel counterparts.
 * @returns {string} The canonical form of the input string.
 */
export const getCanonical = (s, removeAccents = false) => {
  let canonical = s.slice().trim()
  const accents = {
    Á: 'A',
    É: 'E',
    Í: 'I',
    Ó: 'O',
    Ú: 'U',
    Ü: 'U',
  }
  if (removeAccents) {
    _.forEach(accents, (plainVowel, accented) => {
      canonical = canonical.replace(accented, plainVowel)
    })
  }

  return canonical
}

/**
 * Returns a canonical form of the user-input string `s`, where all characters are uppercased and chararacters other than 'Y' and 'G' are replaced with a hyphen.
 * @param {string} key
 */
export const getCanonicalKey = (key) => {
  let result = key.toLocaleUpperCase().trim().split('')
  result = result.map((k) => {
    if ('YG'.includes(k)) {
      return k
    }
    return '-'
  })
  return result.join('')
}

/**
 * Get all words that produce given key from guess
 * @param {string} guess - The guessed word
 * @param {string} key - The returned key
 * @param {string[]} wordList
 */
export const getAnswersMatchingKey = (guess, key, wordList) => {
  const canonicalKey = getCanonicalKey(key)
  const result = wordList.filter((word) => {
    const tempKey = evaluateToString(guess, word)
    return canonicalKey === tempKey
  })
  return result
}

export const guessReverser = (answer, key, wordList) => {
  const canonicalKey = getCanonicalKey(key)
  const result = wordList.filter((word) => {
    const tempKey = evaluateToString(word, answer)
    return canonicalKey === tempKey
  })
  return result
}

/**
 * Return evaluation key (e.g. `YG--Y`) for given `guess` and `answer`
 * @param {string} guess - Guessed word
 * @param {string} answer - Correct answer
 */
export const evaluateToString = (guess, answer) => {
  let remainingAnswer = getCanonical(answer)
  let canonicalGuess = getCanonical(guess)

  const evaluator = createEvaluator(remainingAnswer)
  return evaluator(canonicalGuess)
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
 */ export const createEvaluator = (answer) => {
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
  const evaluator = (guess) => {
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

export const compareEvaluations = (answer, guess1, guess2) => {
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
export const filterWordsUsingGuessResult = (guess, wordList) => {
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
export const getPossibleKeys = (word, wordList) => {
  const result = wordList.map((answer) => {
    return evaluateToString(word, answer)
  })
  return _.uniq(result).sort()
}

/**
 * Analyzes and categorizes a list of potential answers based on their comparison to a given word.
 * This function produces a map (object) where each key is a distinct outcome of a comparison between
 * the given word and an answer from the wordList. Each key's value depends on the `showMatches` parameter:
 * - If `showMatches` is false (default), the value is the count of words in wordList that match this outcome.
 * - If `showMatches` is true, the value is an array of words from wordList that match this outcome.
 * This function is useful for understanding the effectiveness of a given word as a guess. A highly effective guess
 * would produce a map where each key has a count of 1 (meaning every answer comparison produced a unique outcome),
 * whereas a poorly effective guess might produce fewer keys with higher counts.
 * By default, the function returns a sorted array of counts per outcome. If `returnObject` is true,
 * the function instead returns the entire map object.
 *
 * @param {string} word - The word to be compared against each answer in wordList.
 * @param {string[]} wordList - An array of potential answers to be compared to the word.
 * @param {Object} [options] - Optional configuration object.
 * @param {boolean} [options.returnObject=false] - Determines the return type. If true, returns the map object. If false, returns a sorted array of counts.
 * @param {boolean} [options.showMatches=false] - Determines the values in the map. If true, values are arrays of matching words. If false, values are counts.
 *
 * @returns {Object|number[]} Either the map object or a sorted array of counts, depending on the value of `returnObject`.
 */
export const getBins = (word, wordList, { returnObject = false, showMatches = false } = {}) => {
  const comparisonResults = {}
  for (const answer of wordList) {
    const comparisonOutcome = evaluateToString(word, answer)
    if (comparisonResults[comparisonOutcome]) {
      if (showMatches) {
        comparisonResults[comparisonOutcome].push(answer)
      } else {
        comparisonResults[comparisonOutcome] += 1
      }
    } else {
      comparisonResults[comparisonOutcome] = showMatches ? [answer] : 1
    }
  }
  if (returnObject) {
    return comparisonResults
  }
  return Object.values(comparisonResults).sort().reverse()
}

export const getProportionOfWordsInBinsBelowLimit = (bins, limit) => {
  const totalWords = _.sum(bins)
  const filteredBins = bins.filter((size) => size < limit)
  const lessThanLimitWords = _.sum(filteredBins)
  return lessThanLimitWords / totalWords
}

export const getBestChoice = async (
  filteredWordList,
  fullWordList,
  {
    scoring_method = 'random',
    verbose = false,
    bin_limit = 1,
    strictness_proportion = 1,
    db,
  } = {},
) => {
  if (filteredWordList.length === 1) {
    return { word: filteredWordList[0], score: 999 }
  }
  const wordlist_hash = md5(JSON.stringify(filteredWordList))

  let scorer
  let best

  switch (scoring_method) {
    case 'easy_mode':
      const overallBest = getBestHitFromFullList(filteredWordList, fullWordList, {
        limit: bin_limit,
        strictness_proportion: strictness_proportion,
        verbose,
      })
      if (db) {
        await db('cached_evaluations').insert({
          best_word: overallBest.word,
          score: overallBest.score,
          wordlist_hash,
          method: scoring_method,
        })
      }

      return overallBest
    case 'most_in_bins':
      scorer = wordsAtOrBelowLimit(bin_limit)
      break
    case 'sum_roots':
      scorer = sumRoots
      break
    case 'minimax':
      scorer = miniMax
      break
    case 'random':
      return {
        word: _.sample(filteredWordList),
      }
    default:
      throw new Error(`Unknown scoring method: ${scoring_method}`)
  }

  if (db) {
    best = await getCachedAnswer(wordlist_hash, scoring_method, db)

    if (best) {
      return best
    }
  }

  const result = []

  for (const word of filteredWordList) {
    let bins = getBins(word, filteredWordList)

    result.push({
      word,
      score: scorer(bins),
    })
  }

  best = _.maxBy(result, (r) => r.score)

  const entry = {
    best_word: best.word,
    score: best.score,
    wordlist_hash,
    method: scoring_method,
  }

  if (db) {
    await db('cached_evaluations').insert(entry)
  }

  return best
}

export const getBestHitFromFullList = (
  filteredList,
  allWords,
  { limit = 1, verbose = false, strictness_proportion = 1, get_all_matches = false },
) => {
  const scorer = wordsAtOrBelowLimit(limit)

  const acceptable_unique_proportion = strictness_proportion

  const filteredScores = []

  for (const word of filteredList) {
    const normalBins = getBins(word, filteredList)
    const score = scorer(normalBins)
    filteredScores.push({
      word,
      score,
    })
  }

  const bestFiltered = _.maxBy(filteredScores, (o) => o.score)

  if (verbose) {
    console.log(`${filteredList.length} left. Best filtered`, bestFiltered)
  }

  if (bestFiltered.score >= acceptable_unique_proportion * filteredList.length) {
    verbose && console.log(`Returning filtered ${bestFiltered.word}`)
    return {
      word: bestFiltered.word,
      score: bestFiltered.score,
    }
  }

  const allScores = []

  for (const word of allWords) {
    const easyBins = getBins(word, filteredList)
    const score = scorer(easyBins)
    if (score === filteredList.length) {
      verbose && console.log(`Found word to discover answer with certainty:`, word, score)
      return {
        word,
        score,
      }
    } else {
      allScores.push({
        word,
        score,
      })
    }
  }

  const best = _.maxBy(allScores, (o) => o.score)

  if (verbose) {
    console.log(`Best overall`, best)
  }

  verbose && console.log(`End. Returning ${best.word}`)
  return best
}

const getCachedAnswer = async (wordlist_hash, method, db) => {
  const bestWord = await db('cached_evaluations')
    .select()
    .where({
      wordlist_hash,
      method,
    })
    .first()

  if (!bestWord) {
    return null
  }

  return {
    word: bestWord.best_word,
    score: bestWord.score,
  }
}

export const reclassifyAllForAnswer = (answer, wordList, { stop_after_one = false }) => {
  let results = []
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

export const isGuessableInOne = (answer, wordList) => {
  let classifiedKeys = reclassifyAllForAnswer(answer, wordList, { stop_after_one: true })
  let result = classifiedKeys.filter((r) => r.filtered.length === 1)
  console.log(answer, result[0])
  return result.length > 0
}

/*
 * Returns a list of words that are guesses for the given word.
 * @param {string[]} wordList
 * @param {Object[]} guesses
 * @param {string} guesses.word - the guessed word
 * @param {string} guesses.key - the key for the guess
 */
export const applyGuesses = (wordList, guesses) => {
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

export function decompress(text) {
  let lastword = 'zzzzz'
  let words = []
  let i = 0
  let j = 0
  let word
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
 */

export function getUnusedLetters(guessList) {
  const letters = 'abcdefghijklmnopqrstuvwxyz'.toUpperCase()
  const usedLetters = guessList.reduce((acc, guess) => {
    return acc + guess
  }, '')
  return letters.split('').filter((letter) => !usedLetters.includes(letter))
}

export const getUnusedLetterCountInWord = (word, unusedLetters) => {
  return word
    .split('')
    .map((letter) => unusedLetters.includes(letter))
    .filter((r) => r).length
}

/**
 * With a list of guesses, return an array of letters which are used in the word but with unknown positions
 * @param {Object[]} guesses
 * @param {string} guesses[].word
 * @param {string} guesses[].key
 */

export function getYellowLettersInGuesses(guesses) {
  const exampleGuesses = [
    {
      word: 'HELLO',
      key: 'GY-Y-',
    },
  ]

  let yellowLetters = exampleGuesses.reduce((acc, guess) => {
    console.log(acc)
    return [
      ...acc,
      ...guess.word
        .split('')
        .map((letter, index) => {
          if (guess.key[index] === 'Y') {
            return letter
          }
          return null
        })
        .filter((r) => r),
    ]
  }, [])

  console.log(yellowLetters)

  // return guesses.reduce((acc, guess) => {
  //   return acc + guess.key.split('').filter((letter) => letter === 'Y').length
  // }, 0)
}

export function getNextGuess(guessList, wordList) {
  const unusedLetters = getUnusedLetters(guessList)
  const unusedWords = wordList.filter((word) => !guessList.includes(word))
  const unusedLettersInWords = unusedWords.map((word) =>
    getUnusedLetterCountInWord(word, unusedLetters),
  )
  console.log(unusedLettersInWords)

  // console.log(_.shuffle(unusedWordsWithLetters.slice(0, 25)))
  // return unusedWordsWithLetters[0]
}

/**
 * @param {string[]} guessList - List of guessed words
 */
export const getUniqueLetters = (guessList) => {
  return _.uniq(guessList.join('').split('')).join('')
}

/**
 * @param {string[]} guessList - List of guessed words
 */
export const countUniqueLetters = (guessList) => {
  return getUniqueLetters().length
}

/**
 * @param {string[]} guessList - List of guessed words
 * @param {string} word
 */

export const getNewLetterCountInWord = (usedLetters, word) => {
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

export const orderWordsByNewLetters = (wordList, guessList) => {
  const usedLetters = getUniqueLetters(guessList)

  return _.orderBy(
    wordList.map((word) => {
      return {
        word,
        count: getNewLetterCountInWord(usedLetters, word),
      }
    }),
    (a) => a.count,
    'desc',
  )
}

/**
 * @param {string[]} guesses - List of guessed words
 * @param {string} answer
 */

export const guessesIdentifyAnswer = (guesses, answer, wordList) => {
  const guessList = guesses.map((guess) => {
    return {
      word: guess.toUpperCase(),
      key: evaluateToString(guess, answer),
    }
  })

  const remaining = applyGuesses(wordList, guessList)

  return remaining.length === 1
}

export const getPercentageIdentified = (guesses, wordList) => {
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
export const solutionGuaranteed = (guess, wordList) => {
  const evaluations = []
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

export const getGuessesWithKeys = (guesses, answer) => {
  const result = []
  for (const guess of guesses) {
    const ev = {
      word: guess,
      key: evaluateToString(guess, answer),
    }
    result.push(ev)
    // if (ev.key === 'GGGGG') {
    //   return result
    // }
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
export function scoreBinDistribution(arr) {
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
