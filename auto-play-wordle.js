import likelyWords from './likely-word-list.json' with { type: 'json' }
import { getBins, getAnswersMatchingKey, evaluateToString } from '@advancedUtils'
import { SecondGuessCacheDB } from './database.js'
import { getOptimalGuess } from './solver.js'

// Initialize database cache
const cacheDB = new SecondGuessCacheDB()

/**
 * Calculate variance of bin sizes for distribution evaluation
 * @param {number[]} binSizes - Array of bin sizes
 * @returns {number} - Variance value
 */
const calculateVariance = (binSizes) => {
  const n = binSizes.length
  if (n <= 1) return 0
  
  const mean = binSizes.reduce((sum, size) => sum + size, 0) / n
  const variance = binSizes.reduce((sum, size) => sum + Math.pow(size - mean, 2), 0) / n
  
  return variance
}

/**
 * Choose the best guess from remaining words using getBins to maximize separation
 * @param {Array} remainingWords - Words still possible
 * @param {number} guessNumber - Current guess number (for special logic)
 * @param {Array} allWords - Full word list for strategic guessing
 */
const chooseBestGuessFromRemaining = (remainingWords, guessNumber = 3, allWords = likelyWords) => {
  if (remainingWords.length === 1) {
    return {
      word: remainingWords[0],
      bins: 1,
      reason: "Only one word left"
    }
  }
  
  if (remainingWords.length === 2) {
    // With 2 words left, any guess from the remaining words will solve it
    return {
      word: remainingWords[0],
      bins: 2,
      reason: "Two words left - any guess will solve"
    }
  }
  
  // STRATEGIC LOGIC FOR GUESSES 4 & 5: Prioritize perfect separation, fallback to full list only if needed
  if ((guessNumber === 4 || guessNumber === 5) && remainingWords.length > 2) {
    console.log(`   🎯 GUESS ${guessNumber} STRATEGY: Searching for perfect separation among remaining words, then full list if needed`)

    const candidateOrder = [...remainingWords, ...allWords]
    const seenCandidates = new Set()

    for (const candidate of candidateOrder) {
      if (seenCandidates.has(candidate)) continue
      seenCandidates.add(candidate)

      const bins = getBins(candidate, remainingWords, { returnObject: false })
      const maxBinSize = Math.max(...bins)

      if (maxBinSize === 1) {
        const sourceLabel = remainingWords.includes(candidate) ? 'remaining words' : 'full word list'
        console.log(`   ✨ PERFECT SEPARATION FOUND using ${sourceLabel}!`)
        return {
          word: candidate,
          bins: bins.length,
          binSizes: bins,
          reason: `PERFECT SEPARATION (${sourceLabel}): Each of ${bins.length} bins contains exactly 1 word`
        }
      }
    }

    // No perfect separation found; fallback to variance optimization
    console.log(`   ❌ No perfect separation found. Searching for maximum bins with optimal distribution using full word list...`)
    let bestChoice = null
    let maxBins = 0
    let minVariance = Infinity
    
    for (const candidate of allWords) {
      const bins = getBins(candidate, remainingWords, { returnObject: false })
      const numBins = bins.length
      const variance = calculateVariance(bins)
      
      // Prioritize maximum bins, then minimum variance as tiebreaker
      if (numBins > maxBins || (numBins === maxBins && variance < minVariance)) {
        maxBins = numBins
        minVariance = variance
        bestChoice = {
          word: candidate,
          bins: numBins,
          binSizes: bins,
          variance: variance,
          reason: `Maximizes bins (${numBins}) with optimal distribution variance (${variance.toFixed(2)})`
        }
      }
    }
    
    if (bestChoice) {
      console.log(`   🎯 OPTIMAL CHOICE: ${bestChoice.word} creates ${bestChoice.bins} bins with variance ${bestChoice.variance.toFixed(2)}`)
      return bestChoice
    }
  }
  
  // DEFAULT LOGIC FOR GUESS 3: Use remaining words only
  let bestChoice = null
  let maxBins = 0
  
  // Test each remaining word to see which one creates the most bins
  for (const candidate of remainingWords) {
    const bins = getBins(candidate, remainingWords, { returnObject: false })
    const numBins = bins.length
    
    if (numBins > maxBins) {
      maxBins = numBins
      bestChoice = {
        word: candidate,
        bins: numBins,
        binSizes: bins,
        reason: `Creates ${numBins} bins from ${remainingWords.length} remaining words`
      }
    }
  }
  
  return bestChoice
}

/**
 * Auto-play Wordle with full solving capability
 * @param {string} answer - The target word to solve
 * @param {string} initialGuess - The first guess (default: 'CRATE')
 * @param {Object} options - Configuration options
 * @param {boolean} options.generateFullCache - Generate entire cache if missing (default: false)
 * @returns {Object} - Complete game results
 */
const autoPlayWordle = async (answer, initialGuess = 'CRATE', options = {}) => {
  console.log(`\n🎮 AUTO-PLAYING WORDLE`)
  console.log(`=======================`)
  console.log(`Target: ${answer}`)
  console.log(`Starting guess: ${initialGuess}`)
  
  const gameState = {
    guesses: [],
    evaluations: [],
    remainingWords: [...likelyWords],
    solved: false,
    totalGuesses: 0
  }
  
  // GUESS 1: Initial guess
  console.log(`\n1️⃣ GUESS 1: ${initialGuess}`)
  const firstEvaluation = evaluateToString(initialGuess, answer)
  console.log(`   Evaluation: ${firstEvaluation}`)
  
  gameState.guesses.push(initialGuess)
  gameState.evaluations.push(firstEvaluation)
  gameState.totalGuesses++
  
  // Check if solved in 1
  if (firstEvaluation === 'GGGGG') {
    console.log(`🎉 SOLVED IN 1 GUESS!`)
    gameState.solved = true
    gameState.remainingWords = [answer]
    return gameState
  }
  
  // Filter after first guess
  gameState.remainingWords = getAnswersMatchingKey(initialGuess, firstEvaluation, gameState.remainingWords)
  console.log(`   Remaining: ${gameState.remainingWords.length} words`)
  
  // GUESS 2: Use unified getOptimalGuess function
  console.log(`\n2️⃣ GUESS 2: Determining strategy`)
  
  // Use the new unified function with option to generate full cache
  const recommendation = await getOptimalGuess(initialGuess, firstEvaluation, {
    generateFullCache: options.generateFullCache || false,
    silent: true
  })
  
  if (!recommendation) {
    throw new Error(`No recommendation available for evaluation ${firstEvaluation}`)
  }
  
  const secondGuess = recommendation.recommendation
  const strategy = recommendation.reason + (recommendation.cached ? " (cached)" : " (calculated)")
  const secondEvaluation = evaluateToString(secondGuess, answer)
  console.log(`   Word: ${secondGuess}`)
  console.log(`   Evaluation: ${secondEvaluation}`)
  console.log(`   Strategy: ${strategy}`)
  
  gameState.guesses.push(secondGuess)
  gameState.evaluations.push(secondEvaluation)
  gameState.totalGuesses++
  
  // Check if solved in 2
  if (secondEvaluation === 'GGGGG') {
    console.log(`🎉 SOLVED IN 2 GUESSES!`)
    gameState.solved = true
    gameState.remainingWords = [answer]
    return gameState
  }
  
  // Filter after second guess
  gameState.remainingWords = getAnswersMatchingKey(secondGuess, secondEvaluation, gameState.remainingWords)
  console.log(`   Remaining: ${gameState.remainingWords.length} words`)
  
  // GUESS 3+: Use getBins strategy for remaining guesses
  let guessNumber = 3
  const maxGuesses = 6 // Wordle limit: 6 guesses maximum
  
  while (!gameState.solved && guessNumber <= maxGuesses) {
    console.log(`\n${guessNumber}️⃣ GUESS ${guessNumber}: Choosing from ${gameState.remainingWords.length} remaining words`)
    
    if (gameState.remainingWords.length === 0) {
      console.log(`❌ ERROR: No remaining words - target "${answer}" may not be in word list`)
      break
    }
    
    // Show remaining words if there are few enough
    if (gameState.remainingWords.length <= 10) {
      console.log(`   Remaining options: ${gameState.remainingWords.join(', ')}`)
    }
    
    // Choose best guess using getBins strategy
    const bestChoice = chooseBestGuessFromRemaining(gameState.remainingWords, guessNumber, likelyWords)
    const currentGuess = bestChoice.word
    const currentEvaluation = evaluateToString(currentGuess, answer)
    
    console.log(`   Word: ${currentGuess}`)
    console.log(`   Evaluation: ${currentEvaluation}`)
    console.log(`   Strategy: ${bestChoice.reason}`)
    
    gameState.guesses.push(currentGuess)
    gameState.evaluations.push(currentEvaluation)
    gameState.totalGuesses++
    
    // Check if solved
    if (currentEvaluation === 'GGGGG') {
      console.log(`🎉 SOLVED IN ${guessNumber} GUESSES!`)
      gameState.solved = true
      gameState.remainingWords = [answer]
      break
    }
    
    // Filter for next iteration
    gameState.remainingWords = getAnswersMatchingKey(currentGuess, currentEvaluation, gameState.remainingWords)
    console.log(`   Remaining: ${gameState.remainingWords.length} words`)
    
    guessNumber++
  }
  
  if (!gameState.solved && guessNumber > maxGuesses) {
    console.log(`❌ FAILED: Exceeded maximum of ${maxGuesses} guesses`)
  }
  
  return gameState
}

/**
 * Display comprehensive game summary
 */
const displayGameSummary = (gameState, answer, initialGuess) => {
  console.log(`\n📊 GAME SUMMARY`)
  console.log(`===============`)
  console.log(`Target word: ${answer}`)
  console.log(`Starting guess: ${initialGuess}`)
  console.log(`Result: ${gameState.solved ? '✅ SOLVED' : '❌ FAILED'}`)
  console.log(`Total guesses: ${gameState.totalGuesses}`)
  
  console.log(`\n📝 GUESS HISTORY:`)
  gameState.guesses.forEach((guess, index) => {
    console.log(`   ${index + 1}. ${guess} → ${gameState.evaluations[index]}`)
  })
  
  if (gameState.solved) {
    let performance = ''
    if (gameState.totalGuesses === 1) performance = '🌟 INCREDIBLE!'
    else if (gameState.totalGuesses === 2) performance = '🎯 EXCELLENT!'
    else if (gameState.totalGuesses === 3) performance = '👍 VERY GOOD!'
    else if (gameState.totalGuesses === 4) performance = '✅ GOOD!'
    else if (gameState.totalGuesses === 5) performance = '⚠️ OKAY'
    else if (gameState.totalGuesses === 6) performance = '😅 CLOSE CALL'
    else performance = '🤔 TOOK A WHILE'
    
    console.log(`\n${performance}`)
  } else {
    console.log(`\n💔 Better luck next time!`)
    if (gameState.remainingWords.length > 0) {
      console.log(`Final remaining words: ${gameState.remainingWords.slice(0, 10).join(', ')}${gameState.remainingWords.length > 10 ? '...' : ''}`)
    }
  }
}

// Main execution
const run = async () => {
  const args = process.argv.slice(2)
  
  if (args.length === 0) {
    console.log(`
🎮 AUTO WORDLE PLAYER
=====================

This script automatically plays Wordle to completion using optimal strategies:
• 1st guess: Your specified starting word  
• 2nd guess: Uses pre-computed database cache for optimal choice
• 3rd+ guesses: Uses getBins strategy to maximize word separation

Usage: node auto-play-wordle.mjs <answer> [starting_word]

Examples:
  node auto-play-wordle.mjs STORK
  node auto-play-wordle.mjs STORK CRATE  
  node auto-play-wordle.mjs TRADE SLATE

Default starting word is 'CRATE' if not specified.

⚠️  IMPORTANT: Make sure the cache exists for your starting word!
Create cache with: node solver.mjs DUMMY <starting_word>
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
    console.log('❌ Starting guess must be a 5-letter word using only letters A-Z')
    process.exit(1)
  }
  
  try {
    const gameState = await autoPlayWordle(answer, initialGuess)
    displayGameSummary(gameState, answer, initialGuess)
    
    // Return appropriate exit code
    process.exit(gameState.solved ? 0 : 1)
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

// Export for use in other modules
export { autoPlayWordle, chooseBestGuessFromRemaining }

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  run().then(() => {
    console.log('\n✅ Game complete!')
  }).catch(error => {
    console.error('❌ Fatal error:', error)
    process.exit(1)
  })
}
