import likelyWords from './likely-word-list.json'
import { getBins, getAnswersMatchingKey } from '@advancedUtils'
import { SecondGuessCacheDB } from './database.js'

// Type definitions
interface CacheEntry {
  filteredAnswersCount: number
  bestGuesses: BestGuess[]
  maxBins: number
  bestDistribution: number
}

interface Cache {
  [key: string]: CacheEntry
}

interface BestGuess {
  word: string
  bins: number
  distribution: number
}

interface GuessChoice {
  word: string
  bins: number
  binSizes?: number[]
  variance?: number
  distribution?: number
  reason: string
}

interface OptimalGuessResult {
  recommendation: string
  reason: string
  remainingAnswers: number
  cached: boolean
  bins: number
  distribution: number
}

interface GetOptimalOptions {
  generateFullCache?: boolean
  silent?: boolean
}

interface PreComputeOptions {
  initialGuess: string
  likelyWords: string[]
}

// Initialize database cache
const cacheDB = new SecondGuessCacheDB()

const preComputeSecondGuess = ({ initialGuess, likelyWords }: PreComputeOptions): Cache => {
  // for each key, we want to know the word that *maximizes* the number of bins
  // tiebreaker will be how evenly distributed the bins are

  const allKeys = getAllKeys()
  const cache: Cache = {}

  console.log(`Pre-computing second guesses for ${allKeys.length} keys...`)
  console.log(`Using ${likelyWords.length} likely words as both candidates and possible answers`)
  const startTime = Date.now()

  allKeys.forEach((key, index) => {
    if (index % 10 === 0 || index < 20) {
      const elapsed = (Date.now() - startTime) / 1000
      const rate = index / elapsed || 0
      const eta = rate > 0 ? (allKeys.length - index) / rate : 0
      console.log(`Processing key ${index + 1}/${allKeys.length}: ${key} (${elapsed.toFixed(1)}s elapsed, ETA: ${eta.toFixed(1)}s)`)
    }

    // Filter likelyWords to answers that match this key pattern
    const filteredAnswers = getAnswersMatchingKey(initialGuess, key, likelyWords)

    if (filteredAnswers.length === 0) {
      cache[key] = {
        filteredAnswersCount: 0,
        bestGuesses: [],
        maxBins: 0,
        bestDistribution: Infinity
      }
      return
    }

    if (filteredAnswers.length === 1) {
      // Only one answer possible, any guess that includes it would be optimal
      cache[key] = {
        filteredAnswersCount: 1,
        bestGuesses: [{
          word: filteredAnswers[0],
          bins: 1,
          distribution: 0
        }],
        maxBins: 1,
        bestDistribution: 0
      }
      return
    }

    // First pass: find the maximum number of bins
    // Early interrupt: if we find a word that perfectly separates all answers, use it
    const perfectSeparation = filteredAnswers.length
    let maxBins = 0
    const wordBinCounts: Array<{ word: string; bins: number; binSizes: number[] }> = []
    let foundPerfectSeparation = false

    for (const potentialGuess of likelyWords) {
      const bins = getBins(potentialGuess, filteredAnswers, { returnObject: false }) as number[]
      const numBins = bins.length

      wordBinCounts.push({
        word: potentialGuess,
        bins: numBins,
        binSizes: bins
      })

      if (numBins > maxBins) {
        maxBins = numBins
      }

      // Perfect separation found - no point checking other words
      if (numBins === perfectSeparation) {
        foundPerfectSeparation = true
        console.log(`    ⚡ Perfect separation found with "${potentialGuess}" (${numBins} bins for ${perfectSeparation} answers)`)
        break
      }
    }

    // Second pass: among words with maxBins, find the best distribution
    // If we found perfect separation, we only need to consider those words
    const candidateWordsForSecondPass = foundPerfectSeparation
      ? wordBinCounts.filter(item => item.bins === perfectSeparation)
      : wordBinCounts.filter(item => item.bins === maxBins)

    let bestDistribution = Infinity
    let bestGuesses: BestGuess[] = []

    candidateWordsForSecondPass.forEach(candidate => {
      // For perfect separation, distribution is always 0 (each bin has exactly 1 word)
      const variance = foundPerfectSeparation
        ? 0
        : (() => {
          const mean = filteredAnswers.length / candidate.bins
          return candidate.binSizes.reduce((sum, binSize) => sum + Math.pow(binSize - mean, 2), 0) / candidate.bins
        })()

      if (variance < bestDistribution) {
        bestDistribution = variance
        bestGuesses = [{
          word: candidate.word,
          bins: candidate.bins,
          distribution: variance
        }]
      } else if (variance === bestDistribution && bestGuesses.length === 0) {
        // Only add the first word with the same best distribution to keep cache compact
        bestGuesses.push({
          word: candidate.word,
          bins: candidate.bins,
          distribution: variance
        })
      }
    })

    cache[key] = {
      filteredAnswersCount: filteredAnswers.length,
      bestGuesses: bestGuesses,
      maxBins: maxBins,
      bestDistribution: bestDistribution
    }
  })

  const totalTime = (Date.now() - startTime) / 1000
  console.log(`Pre-computation completed in ${totalTime.toFixed(1)}s`)

  return cache
}

/**
 * Calculate variance of bin sizes for distribution evaluation
 * @param {number[]} binSizes - Array of bin sizes
 * @returns {number} - Variance value
 */
const calculateVariance = (binSizes: number[]): number => {
  if (binSizes.length === 0) return 0
  const mean = binSizes.reduce((sum, size) => sum + size, 0) / binSizes.length
  return binSizes.reduce((sum, size) => sum + Math.pow(size - mean, 2), 0) / binSizes.length
}

/**
 * Find the best guess using a single-pass strategy through candidates
 * Prioritizes perfect separation, then maximizes bins with minimum variance
 * @param {Array} remainingWords - Words still possible
 * @param {Array} candidateWords - Words to test as guesses (will test filtered words first, then all words)
 * @returns {Object} - Best guess choice with bins, variance, etc.
 */
const findBestGuessSinglePass = (remainingWords: string[], candidateWords: string[] = likelyWords): GuessChoice | null => {
  if (remainingWords.length === 0) {
    return null
  }

  // Test remaining words first, then all words (avoiding duplicates)
  const candidateOrder = [...remainingWords, ...candidateWords]
  const seenCandidates = new Set<string>()
  let bestChoice: GuessChoice | null = null
  let maxBins = 0
  let minVariance = Infinity

  for (const candidate of candidateOrder) {
    if (seenCandidates.has(candidate)) continue
    seenCandidates.add(candidate)

    const bins = getBins(candidate, remainingWords, { returnObject: false }) as number[]
    const numBins = bins.length
    const variance = calculateVariance(bins)

    // Check for perfect separation: each remaining word gets its own bin
    if (numBins === remainingWords.length) {
      return {
        word: candidate,
        bins: numBins,
        binSizes: bins,
        variance: variance,
        distribution: variance,
        reason: `PERFECT SEPARATION: Each of ${numBins} remaining words gets its own bin`
      }
    }

    // Prioritize maximum bins, then minimum variance as tiebreaker
    if (numBins > maxBins || (numBins === maxBins && variance < minVariance)) {
      maxBins = numBins
      minVariance = variance
      bestChoice = {
        word: candidate,
        bins: numBins,
        binSizes: bins,
        variance: variance,
        distribution: variance,
        reason: `Maximizes bins (${numBins}) with optimal distribution variance (${variance.toFixed(2)})`
      }
    }
  }

  return bestChoice
}

const getAllKeys = (): string[] => {
  const keyCodes = ['-', 'G', 'Y']
  const keyLength = 5

  // Generate all combinations (with repetition) of keyCodes of length keyLength
  const result: string[] = []

  const generateCombinations = (current: string[]): void => {
    if (current.length === keyLength) {
      result.push(current.join(''))
      return
    }

    for (const keyCode of keyCodes) {
      generateCombinations([...current, keyCode])
    }
  }

  generateCombinations([])
  return result
}

/**
 * Get optimal second guess for a given starting word and evaluation
 * Handles cache lookup, on-demand calculation, and optional full cache generation
 * @param {string} initialGuess - The starting word (e.g., 'CRATE')
 * @param {string} evaluation - The evaluation pattern (e.g., 'GY---')
 * @param {Object} options - Configuration options
 * @param {boolean} options.generateFullCache - If true, generates entire cache when missing
 * @param {boolean} options.silent - If true, suppresses console output
 * @returns {Object|null} - Optimal guess recommendation or null if no valid options
 */
const getOptimalGuess = async (initialGuess: string, evaluation: string, options: GetOptimalOptions = {}): Promise<OptimalGuessResult | null> => {
  const { generateFullCache = false, silent = false } = options

  if (!silent) {
    console.log(`🎯 Finding optimal guess for ${initialGuess} → ${evaluation}`)
  }

  // Check if cache exists for this starting word
  const cacheExists = await cacheDB.cacheExists(initialGuess)
  let cache: Cache

  if (cacheExists) {
    // Load existing cache
    cache = await cacheDB.loadCache(initialGuess)
    if (!silent) {
      console.log(`✅ Using cached data for ${initialGuess}`)
    }

    // Check if this specific evaluation pattern exists in the cache
    if (cache[evaluation]) {
      // Found the pattern in cache - use it
      const keyData = cache[evaluation]

      if (!keyData || keyData.filteredAnswersCount === 0) {
        if (!silent) {
          console.log(`❌ No valid moves for evaluation ${evaluation}`)
        }
        return null
      }

      if (keyData.filteredAnswersCount === 1) {
        const result: OptimalGuessResult = {
          recommendation: keyData.bestGuesses[0].word,
          reason: "Only one possible answer remains",
          remainingAnswers: 1,
          cached: true,
          bins: keyData.bestGuesses[0].bins,
          distribution: keyData.bestGuesses[0].distribution
        }

        if (!silent) {
          console.log(`🎯 Optimal guess: ${result.recommendation} (${result.reason})`)
        }
        return result
      }

      const bestGuess = keyData.bestGuesses[0]
      const result: OptimalGuessResult = {
        recommendation: bestGuess.word,
        reason: `Maximizes bins (${bestGuess.bins}) with lowest distribution variance (${bestGuess.distribution.toFixed(2)})`,
        remainingAnswers: keyData.filteredAnswersCount,
        cached: true,
        bins: bestGuess.bins,
        distribution: bestGuess.distribution
      }

      if (!silent) {
        console.log(`🎯 Optimal guess: ${result.recommendation} (${result.reason})`)
      }
      return result
    } else {
      // Pattern not in cache - fall back to on-demand calculation
      if (!silent) {
        console.log(`📊 Pattern ${evaluation} not in cache. Calculating on-demand...`)
      }
      cache = await calculateSingleEvaluation(initialGuess, evaluation, silent)
    }
  } else {
    if (generateFullCache) {
      // Generate complete cache for this starting word
      if (!silent) {
        console.log(`\n📊 Cache missing for ${initialGuess}. Generating full cache...`)
        console.log(`This may take about 90 seconds...`)
      }

      cache = preComputeSecondGuess({
        initialGuess,
        likelyWords
      })
      await cacheDB.saveCache(initialGuess, cache)

      if (!silent) {
        console.log(`✅ Full cache created and saved to database`)
      }
    } else {
      // Calculate just this specific evaluation on-demand
      if (!silent) {
        console.log(`📊 Cache missing for ${initialGuess}. Calculating on-demand for ${evaluation}...`)
      }

      cache = await calculateSingleEvaluation(initialGuess, evaluation, silent)
    }
  }

  // At this point, cache should contain the evaluation pattern
  // Get the recommendation for this specific evaluation
  const keyData = cache[evaluation]

  if (!keyData || keyData.filteredAnswersCount === 0) {
    if (!silent) {
      console.log(`❌ No valid moves for evaluation ${evaluation}`)
    }
    return null
  }

  if (keyData.filteredAnswersCount === 1) {
    const result: OptimalGuessResult = {
      recommendation: keyData.bestGuesses[0].word,
      reason: "Only one possible answer remains",
      remainingAnswers: 1,
      cached: false, // This came from on-demand calculation
      bins: keyData.bestGuesses[0].bins,
      distribution: keyData.bestGuesses[0].distribution
    }

    if (!silent) {
      console.log(`🎯 Optimal guess: ${result.recommendation} (${result.reason})`)
    }
    return result
  }

  const bestGuess = keyData.bestGuesses[0]
  const result: OptimalGuessResult = {
    recommendation: bestGuess.word,
    reason: `Maximizes bins (${bestGuess.bins}) with lowest distribution variance (${bestGuess.distribution.toFixed(2)})`,
    remainingAnswers: keyData.filteredAnswersCount,
    cached: false, // This came from on-demand calculation
    bins: bestGuess.bins,
    distribution: bestGuess.distribution
  }

  if (!silent) {
    console.log(`🎯 Optimal guess: ${result.recommendation} (${result.reason})`)
  }
  return result
}

/**
 * Calculate optimal guess for a single evaluation on-demand
 * Uses a two-step process: first test remaining words for perfect separation,
 * then test all words for maximum bins if no perfect separation found.
 * @param {string} initialGuess - The starting word
 * @param {string} evaluation - The evaluation pattern
 * @param {boolean} silent - Whether to suppress output
 * @returns {Object} - Cache object with single evaluation
 */
const calculateSingleEvaluation = async (initialGuess: string, evaluation: string, silent: boolean = false): Promise<Cache> => {
  if (!silent) {
    console.log(`🔄 Computing optimal guess for ${initialGuess} → ${evaluation}...`)
  }

  // Filter to words that match this evaluation
  const filteredAnswers = getAnswersMatchingKey(initialGuess, evaluation, likelyWords)

  if (filteredAnswers.length === 0) {
    return {
      [evaluation]: {
        filteredAnswersCount: 0,
        bestGuesses: [],
        maxBins: 0,
        bestDistribution: Infinity
      }
    }
  }

  if (filteredAnswers.length === 1) {
    return {
      [evaluation]: {
        filteredAnswersCount: 1,
        bestGuesses: [{
          word: filteredAnswers[0],
          bins: 1,
          distribution: 0
        }],
        maxBins: 1,
        bestDistribution: 0
      }
    }
  }

  const startTime = Date.now()
  let bestGuesses: BestGuess[] = []
  let maxBins = 0
  let bestDistribution = Infinity
  let foundPerfectSeparation = false

  if (!silent) {
    console.log(`   🎯 Step 1: Testing ${filteredAnswers.length} remaining words for perfect separation...`)
  }

  // STEP 1: Test remaining words for perfect separation
  for (const candidate of filteredAnswers) {
    try {
      const bins = getBins(candidate, filteredAnswers, { returnObject: true }) as Record<string, number | string[]>
      const numBins = Object.keys(bins).length
      const distribution = calculateVariance(Object.values(bins).map(v => typeof v === 'number' ? v : v.length)) // bins values are already counts

      // Perfect separation: each remaining word goes to its own bin
      if (numBins === filteredAnswers.length) {
        if (!silent) {
          console.log(`    ⚡ Perfect separation found with "${candidate}" (${numBins} bins for ${filteredAnswers.length} answers)`)
        }

        // With perfect separation, any of these words will solve in one more guess
        // Prefer the candidate itself as it's from the remaining words
        bestGuesses = [{
          word: candidate,
          bins: numBins,
          distribution: 0 // Perfect separation always has 0 variance
        }]
        maxBins = numBins
        bestDistribution = 0
        foundPerfectSeparation = true
        break
      }

      // Track the best non-perfect option from remaining words
      if (numBins > maxBins || (numBins === maxBins && distribution < bestDistribution)) {
        if (numBins > maxBins) {
          bestGuesses = []
          maxBins = numBins
          bestDistribution = distribution
        } else if (distribution < bestDistribution) {
          bestGuesses = []
          bestDistribution = distribution
        }

        bestGuesses.push({
          word: candidate,
          bins: numBins,
          distribution: distribution
        })
      }
    } catch (error) {
      // Skip problematic candidates
      continue
    }
  }

  // STEP 2: If no perfect separation found, test all words for maximum bins
  if (!foundPerfectSeparation) {
    if (!silent) {
      console.log(`   🔍 Step 2: Testing all ${likelyWords.length} words for maximum bins...`)
    }

    for (let i = 0; i < likelyWords.length; i++) {
      const candidate = likelyWords[i]

      // Show progress for longer calculations
      if (!silent && i % 1000 === 0 && i > 0) {
        const elapsed = (Date.now() - startTime) / 1000
        const progress = (i / likelyWords.length * 100).toFixed(1)
        console.log(`     Progress: ${progress}% (${elapsed.toFixed(1)}s elapsed)`)
      }

      try {
        const bins = getBins(candidate, filteredAnswers, { returnObject: true }) as Record<string, number | string[]>
        const numBins = Object.keys(bins).length
        const distribution = calculateVariance(Object.values(bins).map(v => typeof v === 'number' ? v : v.length)) // bins values are already counts

        // Check if this achieves perfect separation
        if (numBins === filteredAnswers.length) {
          if (!silent) {
            console.log(`    ⚡ Perfect separation found with "${candidate}" (${numBins} bins for ${filteredAnswers.length} answers)`)
          }

          // Perfect separation trumps everything
          bestGuesses = [{
            word: candidate,
            bins: numBins,
            distribution: 0
          }]
          maxBins = numBins
          bestDistribution = 0
          foundPerfectSeparation = true
          break
        }

        // Track best non-perfect option
        if (numBins > maxBins || (numBins === maxBins && distribution < bestDistribution)) {
          if (numBins > maxBins) {
            bestGuesses = []
            maxBins = numBins
            bestDistribution = distribution
          } else if (distribution < bestDistribution) {
            bestGuesses = []
            bestDistribution = distribution
          }

          bestGuesses.push({
            word: candidate,
            bins: numBins,
            distribution: distribution
          })
        }
      } catch (error) {
        // Skip problematic candidates
        continue
      }
    }
  }

  const cache: Cache = {
    [evaluation]: {
      filteredAnswersCount: filteredAnswers.length,
      bestGuesses: bestGuesses.slice(0, 5), // Keep top 5
      maxBins,
      bestDistribution
    }
  }

  if (!silent) {
    const elapsed = (Date.now() - startTime) / 1000
    const strategy = foundPerfectSeparation ? "Perfect separation" : `Best bins (${maxBins})`
    console.log(`✅ Calculation completed in ${elapsed.toFixed(1)}s - ${strategy}`)
  }

  // Optionally cache this single result for future use
  try {
    const existingCache = await cacheDB.cacheExists(initialGuess)
      ? await cacheDB.loadCache(initialGuess)
      : {}

    const updatedCache = { ...existingCache, ...cache }
    await cacheDB.saveCache(initialGuess, updatedCache)

    if (!silent) {
      console.log(`💾 Result cached for future use`)
    }
  } catch (error: any) {
    if (!silent) {
      console.log(`⚠️ Could not cache result: ${(error as Error).message}`)
    }
  }

  return cache
}

/**
 * Ensure cache exists for the given initial guess, create if needed
 */
const ensureCache = async (initialGuess: string): Promise<void> => {
  const cacheExists = await cacheDB.cacheExists(initialGuess)

  if (!cacheExists) {
    console.log(`\n📊 Creating cache for initial guess: ${initialGuess}`)
    console.log(`This may take about 90 seconds...`)

    const cache = preComputeSecondGuess({
      initialGuess,
      likelyWords
    })
    await cacheDB.saveCache(initialGuess, cache)

    console.log(`✅ Cache created and saved to database`)
  } else {
    console.log(`✅ Cache found for initial guess: ${initialGuess}`)
  }
}

// Main execution function for CLI usage
const run = async (): Promise<void> => {
  const args = process.argv.slice(2)

  if (args.length === 0) {
    console.log(`
🎯 WORDLE SOLVER CACHE GENERATOR
================================

This script generates or manages solver caches for optimal Wordle gameplay.

Usage: node solver.mjs <command> [options]

Commands:
  ensure <initial_guess>    Create cache for initial guess if it doesn't exist
  DUMMY <initial_guess>     Generate cache for initial guess (alias for ensure)

Examples:
  node solver.mjs ensure CRATE
  node solver.mjs DUMMY SLATE
  node solver.mjs ensure TRACE

⚠️  Cache generation takes about 90 seconds for each starting word.
`)
    process.exit(0)
  }

  const command = args[0].toLowerCase()
  const initialGuess = args[1] ? args[1].toUpperCase() : 'CRATE'

  // Validate initial guess
  if (initialGuess.length !== 5 || !/^[A-Z]+$/.test(initialGuess)) {
    console.log('❌ Initial guess must be a 5-letter word using only letters A-Z')
    process.exit(1)
  }

  try {
    switch (command) {
      case 'ensure':
      case 'dummy':
        await ensureCache(initialGuess)
        console.log(`✅ Cache operation completed for ${initialGuess}`)
        break

      default:
        console.log(`❌ Unknown command: ${command}`)
        console.log('Use "ensure" or "DUMMY" followed by a 5-letter word')
        process.exit(1)
    }
  } catch (error: any) {
    console.error('❌ Error:', (error as Error).message)
    process.exit(1)
  }
}

// Export the main functions for use in other modules
export { ensureCache, getOptimalGuess, findBestGuessSinglePass }

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  run().then(() => {
    console.log('\n✅ Done!')
    process.exit(0)
  }).catch((error: any) => {
    console.error('❌ Fatal error:', error)
    process.exit(1)
  })
}