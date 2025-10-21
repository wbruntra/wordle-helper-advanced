import likelyWords from './likely-word-list.json' with { type: 'json' }
import { getBins, getAnswersMatchingKey, evaluateToString } from '@advancedUtils'
import { SecondGuessCacheDB } from './database.js'
import db from './database.js'
import fs from 'fs'
import path from 'path'

// Initialize database cache
const cacheDB = new SecondGuessCacheDB()

// Console output capture utility
class ConsoleCapture {
  constructor() {
    this.logs = []
    this.originalLog = console.log
  }
  
  start() {
    this.logs = []
    console.log = (...args) => {
      const message = args.join(' ')
      this.logs.push({
        type: 'log',
        message,
        timestamp: new Date().toISOString()
      })
      // Also log to actual console for debugging
      this.originalLog(...args)
    }
  }
  
  stop() {
    console.log = this.originalLog
    return this.logs
  }
  
  getLogs() {
    return this.logs
  }
}

// Helper function to get word definitions
const getWordDefinitions = async (words) => {
  try {
    if (!words || words.length === 0) return []
    
    const definitions = await db('word_classifications')
      .whereIn('word', words)
      .select('word', 'definition', 'category', 'classification', 'frequency_score', 'likely_wordle')
    
    // Create a map for quick lookup
    const definitionMap = {}
    definitions.forEach(def => {
      definitionMap[def.word] = {
        word: def.word,
        definition: def.definition || 'No definition available',
        category: def.category || 'Unknown',
        classification: def.classification || 'Unknown',
        frequency_score: def.frequency_score || 0,
        likely_wordle: def.likely_wordle === 1
      }
    })
    
    // Return definitions in the same order as input words, with fallback for missing words
    return words.map(word => definitionMap[word] || {
      word,
      definition: 'No definition available',
      category: 'Unknown',
      classification: 'Unknown', 
      frequency_score: 0,
      likely_wordle: false
    })
  } catch (error) {
    console.error('Error fetching word definitions:', error)
    // Return empty definitions as fallback
    return words.map(word => ({
      word,
      definition: 'Error loading definition',
      category: 'Unknown',
      classification: 'Unknown',
      frequency_score: 0,
      likely_wordle: false
    }))
  }
}

const preComputeSecondGuess = ({ initialGuess, likelyWords }) => {
  // for each key, we want to know the word that *maximizes* the number of bins
  // tiebreaker will be how evenly distributed the bins are
  
  const allKeys = getAllKeys()
  const cache = {}
  
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
    const wordBinCounts = []
    let foundPerfectSeparation = false
    
    for (const potentialGuess of likelyWords) {
      const bins = getBins(potentialGuess, filteredAnswers, { returnObject: false })
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
    let bestGuesses = []
    
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
const calculateVariance = (binSizes) => {
  if (binSizes.length === 0) return 0
  const mean = binSizes.reduce((sum, size) => sum + size, 0) / binSizes.length
  return binSizes.reduce((sum, size) => sum + Math.pow(size - mean, 2), 0) / binSizes.length
}

const getAllKeys = () => {
  const keyCodes = ['-', 'G', 'Y']
  const keyLength = 5

  // Generate all combinations (with repetition) of keyCodes of length keyLength
  const result = []
  
  const generateCombinations = (current) => {
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

const getOptimalSecondGuess = (initialGuess, evaluationKey, cache) => {
  const keyData = cache[evaluationKey]
  
  // Handle cases where the key doesn't exist in cache or results in no possible answers
  // This can happen with impossible key patterns (e.g., too many correct letters for the initial guess)
  if (!keyData || keyData.filteredAnswersCount === 0) {
    return null
  }
  
  // Handle the case where only one answer remains (game would be solved)
  if (keyData.filteredAnswersCount === 1) {
    return {
      recommendation: keyData.bestGuesses[0].word,
      reason: "Only one possible answer remains",
      ...keyData.bestGuesses[0]
    }
  }
  
  // Return the optimal second guess based on maximizing bins and minimizing distribution variance
  const bestGuess = keyData.bestGuesses[0]
  return {
    recommendation: bestGuess.word,
    reason: `Maximizes bins (${bestGuess.bins}) with lowest distribution variance (${bestGuess.distribution.toFixed(2)})`,
    remainingAnswers: keyData.filteredAnswersCount,
    ...bestGuess
  }
}

/**
 * Main function to solve a Wordle puzzle up to the 3rd guess
 * @param {string} answer - The target word to solve
 * @param {string} initialGuess - The first guess (default: 'CRATE')
 * @returns {Object} - Results of the solving process
 */
const solveWordle = async (answer, initialGuess = 'CRATE') => {
  console.log(`\n🎯 SOLVING WORDLE`)
  console.log(`================`)
  console.log(`Target: ${answer}`)
  console.log(`First guess: ${initialGuess}`)
  
  // Ensure cache exists for the initial guess
  await ensureCache(initialGuess)
  
  // Load the cache
  const secondGuessCache = await cacheDB.loadCache(initialGuess)
  
  // Step 1: Evaluate the first guess
  const firstEvaluation = evaluateToString(initialGuess, answer)
  console.log(`\n1️⃣ First guess evaluation: ${initialGuess} → ${firstEvaluation}`)
  
  // Check if solved in 1 guess
  if (firstEvaluation === 'GGGGG') {
    console.log(`🎉 SOLVED IN 1 GUESS!`)
    return {
      solved: true,
      guesses: 1,
      guessHistory: [{ word: initialGuess, evaluation: firstEvaluation }],
      remainingWords: [answer]
    }
  }
  
  // Filter word list after first guess
  const remainingAfterFirst = getAnswersMatchingKey(initialGuess, firstEvaluation, likelyWords)
  console.log(`   Remaining after first guess: ${remainingAfterFirst.length} words`)
  
  // Step 2: Get optimal second guess
  const secondGuessRecommendation = getOptimalSecondGuess(initialGuess, firstEvaluation, secondGuessCache)
  
  if (!secondGuessRecommendation) {
    console.log(`❌ No recommendation available for evaluation ${firstEvaluation}`)
    return {
      solved: false,
      error: `No recommendation for evaluation ${firstEvaluation}`,
      guessHistory: [{ word: initialGuess, evaluation: firstEvaluation }]
    }
  }
  
  const secondGuess = secondGuessRecommendation.recommendation
  const secondEvaluation = evaluateToString(secondGuess, answer)
  console.log(`\n2️⃣ Second guess evaluation: ${secondGuess} → ${secondEvaluation}`)
  console.log(`   Strategy: ${secondGuessRecommendation.reason}`)
  
  // Check if solved in 2 guesses
  if (secondEvaluation === 'GGGGG') {
    console.log(`🎉 SOLVED IN 2 GUESSES!`)
    return {
      solved: true,
      guesses: 2,
      guessHistory: [
        { word: initialGuess, evaluation: firstEvaluation },
        { word: secondGuess, evaluation: secondEvaluation }
      ],
      remainingWords: [answer]
    }
  }
  
  // Step 3: Filter remaining words after second guess
  const remainingAfterSecond = getAnswersMatchingKey(secondGuess, secondEvaluation, remainingAfterFirst)
  console.log(`   Remaining after second guess: ${remainingAfterSecond.length} words`)
  
  // Show remaining possibilities
  if (remainingAfterSecond.length <= 15) {
    console.log(`\n3️⃣ Remaining possibilities for 3rd guess:`)
    console.log(`   ${remainingAfterSecond.join(', ')}`)
  } else {
    console.log(`\n3️⃣ Too many possibilities (${remainingAfterSecond.length}) - showing first 15:`)
    console.log(`   ${remainingAfterSecond.slice(0, 15).join(', ')}...`)
  }
  
  // Validate that our target is still possible
  const targetStillPossible = remainingAfterSecond.includes(answer)
  console.log(`\n✓ Target "${answer}" still in possible answers: ${targetStillPossible}`)
  
  // Determine success likelihood
  let status = ''
  if (remainingAfterSecond.length === 1) {
    status = '🎯 READY TO SOLVE - Only 1 word left!'
  } else if (remainingAfterSecond.length <= 3) {
    status = '🎯 EXCELLENT - Very likely to solve in 3rd guess'
  } else if (remainingAfterSecond.length <= 10) {
    status = '✅ GOOD - Should solve in 3-4 guesses'
  } else {
    status = '⚠️  CHALLENGING - May require 4+ guesses'
  }
  
  console.log(`\n${status}`)
  
  return {
    solved: false,
    guesses: 2,
    guessHistory: [
      { word: initialGuess, evaluation: firstEvaluation },
      { word: secondGuess, evaluation: secondEvaluation }
    ],
    remainingWords: remainingAfterSecond,
    targetStillPossible,
    status,
    wordsEliminated: likelyWords.length - remainingAfterSecond.length
  }
}

/**
 * Main function to solve a Wordle puzzle up to the 3rd guess - API version with console capture
 * @param {string} answer - The target word to solve
 * @param {string} initialGuess - The first guess (default: 'CRATE')
 * @returns {Object} - Results of the solving process including console output
 */
const solveWordleAPI = async (answer, initialGuess = 'CRATE') => {
  const capture = new ConsoleCapture()
  capture.start()
  
  try {
    console.log(`\n🎯 SOLVING WORDLE`)
    console.log(`================`)
    console.log(`Target: ${answer}`)
    console.log(`First guess: ${initialGuess}`)
    
    // Ensure cache exists for the initial guess
    await ensureCache(initialGuess)
    
    // Load the cache
    const secondGuessCache = await cacheDB.loadCache(initialGuess)
    
    // Step 1: Evaluate the first guess
    const firstEvaluation = evaluateToString(initialGuess, answer)
    console.log(`\n1️⃣ First guess evaluation: ${initialGuess} → ${firstEvaluation}`)
    
    // Check if solved in 1 guess
    if (firstEvaluation === 'GGGGG') {
      console.log(`🎉 SOLVED IN 1 GUESS!`)
      const logs = capture.stop()
      return {
        solved: true,
        guesses: 1,
        guessHistory: [{ word: initialGuess, evaluation: firstEvaluation }],
        remainingWords: [answer],
        consoleOutput: logs
      }
    }
    
    // Filter word list after first guess
    const remainingAfterFirst = getAnswersMatchingKey(initialGuess, firstEvaluation, likelyWords)
    console.log(`   Remaining after first guess: ${remainingAfterFirst.length} words`)
    
    // Step 2: Get optimal second guess
    const secondGuessRecommendation = getOptimalSecondGuess(initialGuess, firstEvaluation, secondGuessCache)
    
    if (!secondGuessRecommendation) {
      console.log(`❌ No recommendation available for evaluation ${firstEvaluation}`)
      const logs = capture.stop()
      return {
        solved: false,
        error: `No recommendation for evaluation ${firstEvaluation}`,
        guessHistory: [{ word: initialGuess, evaluation: firstEvaluation }],
        consoleOutput: logs
      }
    }
    
    const secondGuess = secondGuessRecommendation.recommendation
    const secondEvaluation = evaluateToString(secondGuess, answer)
    console.log(`\n2️⃣ Second guess evaluation: ${secondGuess} → ${secondEvaluation}`)
    console.log(`   Strategy: ${secondGuessRecommendation.reason}`)
    
    // Check if solved in 2 guesses
    if (secondEvaluation === 'GGGGG') {
      console.log(`🎉 SOLVED IN 2 GUESSES!`)
      const logs = capture.stop()
      return {
        solved: true,
        guesses: 2,
        guessHistory: [
          { word: initialGuess, evaluation: firstEvaluation },
          { word: secondGuess, evaluation: secondEvaluation }
        ],
        remainingWords: [answer],
        consoleOutput: logs
      }
    }
    
    // Step 3: Filter remaining words after second guess
    const remainingAfterSecond = getAnswersMatchingKey(secondGuess, secondEvaluation, remainingAfterFirst)
    console.log(`   Remaining after second guess: ${remainingAfterSecond.length} words`)
    
    // Get definitions for remaining words
    const remainingWordsWithDefinitions = await getWordDefinitions(remainingAfterSecond)
    
    // Show remaining possibilities
    if (remainingAfterSecond.length <= 15) {
      console.log(`\n3️⃣ Remaining possibilities for 3rd guess:`)
      console.log(`   ${remainingAfterSecond.join(', ')}`)
    } else {
      console.log(`\n3️⃣ Too many possibilities (${remainingAfterSecond.length}) - showing first 15:`)
      console.log(`   ${remainingAfterSecond.slice(0, 15).join(', ')}...`)
    }
    
    // Validate that our target is still possible
    const targetStillPossible = remainingAfterSecond.includes(answer)
    console.log(`\n✓ Target "${answer}" still in possible answers: ${targetStillPossible}`)
    
    // Determine success likelihood
    let status = ''
    if (remainingAfterSecond.length === 1) {
      status = '🎯 READY TO SOLVE - Only 1 word left!'
    } else if (remainingAfterSecond.length <= 3) {
      status = '🎯 EXCELLENT - Very likely to solve in 3rd guess'
    } else if (remainingAfterSecond.length <= 10) {
      status = '✅ GOOD - Should solve in 3-4 guesses'
    } else {
      status = '⚠️  CHALLENGING - May require 4+ guesses'
    }
    
    console.log(`\n${status}`)
    
    console.log(`\n📈 FINAL SUMMARY`)
    console.log(`================`)
    console.log(`Target word: ${answer}`)
    console.log(`Initial guess: ${initialGuess}`)
    console.log(`Solved: NO`)
    console.log(`Guesses made: 2`)
    console.log(`Words eliminated: ${likelyWords.length - remainingAfterSecond.length}/${likelyWords.length} (${(((likelyWords.length - remainingAfterSecond.length)/likelyWords.length)*100).toFixed(1)}%)`)
    console.log(`Remaining possibilities: ${remainingAfterSecond.length}`)
    
    const logs = capture.stop()
    
    return {
      solved: false,
      guesses: 2,
      guessHistory: [
        { word: initialGuess, evaluation: firstEvaluation },
        { word: secondGuess, evaluation: secondEvaluation }
      ],
      remainingWords: remainingAfterSecond,
      remainingWordsWithDefinitions,
      targetStillPossible,
      status,
      wordsEliminated: likelyWords.length - remainingAfterSecond.length,
      consoleOutput: logs
    }
  } catch (error) {
    const logs = capture.stop()
    throw {
      ...error,
      consoleOutput: logs
    }
  }
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
const getOptimalGuess = async (initialGuess, evaluation, options = {}) => {
  const { generateFullCache = false, silent = false } = options
  
  if (!silent) {
    console.log(`🎯 Finding optimal guess for ${initialGuess} → ${evaluation}`)
  }
  
  // Check if cache exists for this starting word
  const cacheExists = await cacheDB.cacheExists(initialGuess)
  let cache
  
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
        const result = {
          recommendation: keyData.bestGuesses[0].word,
          reason: "Only one possible answer remains",
          remainingAnswers: 1,
          cached: true,
          ...keyData.bestGuesses[0]
        }
        
        if (!silent) {
          console.log(`🎯 Optimal guess: ${result.recommendation} (${result.reason})`)
        }
        return result
      }
      
      const bestGuess = keyData.bestGuesses[0]
      const result = {
        recommendation: bestGuess.word,
        reason: `Maximizes bins (${bestGuess.bins}) with lowest distribution variance (${bestGuess.distribution.toFixed(2)})`,
        remainingAnswers: keyData.filteredAnswersCount,
        cached: true,
        ...bestGuess
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
    const result = {
      recommendation: keyData.bestGuesses[0].word,
      reason: "Only one possible answer remains",
      remainingAnswers: 1,
      cached: false, // This came from on-demand calculation
      ...keyData.bestGuesses[0]
    }
    
    if (!silent) {
      console.log(`🎯 Optimal guess: ${result.recommendation} (${result.reason})`)
    }
    return result
  }
  
  const bestGuess = keyData.bestGuesses[0]
  const result = {
    recommendation: bestGuess.word,
    reason: `Maximizes bins (${bestGuess.bins}) with lowest distribution variance (${bestGuess.distribution.toFixed(2)})`,
    remainingAnswers: keyData.filteredAnswersCount,
    cached: false, // This came from on-demand calculation
    ...bestGuess
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
const calculateSingleEvaluation = async (initialGuess, evaluation, silent = false) => {
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
  let bestGuesses = []
  let maxBins = 0
  let bestDistribution = Infinity
  let foundPerfectSeparation = false
  
  if (!silent) {
    console.log(`   🎯 Step 1: Testing ${filteredAnswers.length} remaining words for perfect separation...`)
  }
  
  // STEP 1: Test remaining words for perfect separation
  for (const candidate of filteredAnswers) {
    try {
      const bins = getBins(candidate, filteredAnswers, { returnObject: true })
      const numBins = Object.keys(bins).length
      const distribution = calculateVariance(Object.values(bins)) // bins values are already counts
      
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
        const bins = getBins(candidate, filteredAnswers, { returnObject: true })
        const numBins = Object.keys(bins).length
        const distribution = calculateVariance(Object.values(bins)) // bins values are already counts
        
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
  
  const cache = {
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
  } catch (error) {
    if (!silent) {
      console.log(`⚠️ Could not cache result: ${error.message}`)
    }
  }
  
  return cache
}

/**
 * Ensure cache exists for the given initial guess, create if needed
 */
const ensureCache = async (initialGuess) => {
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

// Main execution - Interactive solver
const run = async () => {
  // Get command line arguments
  const args = process.argv.slice(2)
  
  if (args.length === 0) {
    console.log(`
🎯 WORDLE SOLVER
===============

Usage: node solver.js <answer> [initial_guess]

Examples:
  node solver.js STORK
  node solver.js STORK CRATE
  node solver.js TRADE SLATE

Default initial guess is 'CRATE' if not specified.
`)
    process.exit(0)
  }
  
  const answer = args[0].toUpperCase()
  const initialGuess = args[1] ? args[1].toUpperCase() : 'CRATE'
  
  // Validate inputs
  if (answer.length !== 5 || !/^[A-Z]+$/.test(answer)) {
    console.log('❌ Answer must be a 5-letter word using only letters A-Z')
    process.exit(1)
  }
  
  if (initialGuess.length !== 5 || !/^[A-Z]+$/.test(initialGuess)) {
    console.log('❌ Initial guess must be a 5-letter word using only letters A-Z')
    process.exit(1)
  }
  
  try {
    const result = await solveWordle(answer, initialGuess)
    
    console.log(`\n📈 FINAL SUMMARY`)
    console.log(`================`)
    console.log(`Target word: ${answer}`)
    console.log(`Initial guess: ${initialGuess}`)
    console.log(`Solved: ${result.solved ? 'YES' : 'NO'}`)
    console.log(`Guesses made: ${result.guesses}`)
    
    if (!result.solved && result.remainingWords) {
      console.log(`Words eliminated: ${result.wordsEliminated}/${likelyWords.length} (${((result.wordsEliminated/likelyWords.length)*100).toFixed(1)}%)`)
      console.log(`Remaining possibilities: ${result.remainingWords.length}`)
    }
    
    if (result.error) {
      console.log(`Error: ${result.error}`)
    }
    
  } catch (error) {
    console.error('❌ An error occurred:', error.message)
    process.exit(1)
  }
}

// Export the main function for use in other modules
export { solveWordle, solveWordleAPI, ensureCache, getOptimalGuess }

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  run().then(() => {
    console.log('\n✅ Done!')
    process.exit(0)
  }).catch(error => {
    console.error('❌ Fatal error:', error)
    process.exit(1)
  })
}
