import likelyWords from './likely-word-list.json' with { type: 'json' }
import { getBins, getAnswersMatchingKey, evaluateToString } from '@advancedUtils'
import { SecondGuessCacheDB } from './database.js'
import { getOptimalGuess, findBestGuessSinglePass } from './solver.js'

// Initialize database cache
const cacheDB = new SecondGuessCacheDB()

/**
 * Choose the best guess from remaining words using getBins to maximize separation
 * Handles guesses 2-6 with appropriate strategies for each
 * @param {Array} remainingWords - Words still possible
 * @param {number} guessNumber - Current guess number (for special logic)
 * @param {Array} allWords - Full word list for strategic guessing
 * @param {Object} options - Configuration options
 * @param {string} options.previousGuess - Previous guess (required for guess 2)
 * @param {string} options.previousEvaluation - Previous evaluation (required for guess 2)
 * @param {boolean} options.generateFullCache - Generate full cache if missing (for guess 2)
 * @param {boolean} options.silent - Suppress console output (default: false)
 * @returns {Promise<Object>} - Best guess choice
 */
const chooseBestGuessFromRemaining = async (remainingWords, guessNumber = 3, allWords = likelyWords, options = {}) => {
  const { silent = false } = options
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
  
  // STRATEGIC LOGIC FOR GUESS 2: Use database cache or calculate on-demand
  if (guessNumber === 2) {
    const { previousGuess, previousEvaluation, generateFullCache = false } = options
    
    if (!previousGuess || !previousEvaluation) {
      throw new Error('Guess 2 requires previousGuess and previousEvaluation in options')
    }
    
    if (!silent) console.log(`   🎯 GUESS 2 STRATEGY: Using cached or calculated optimal separation`)
    
    const recommendation = await getOptimalGuess(previousGuess, previousEvaluation, {
      generateFullCache,
      silent: true
    })
    
    if (!recommendation) {
      throw new Error(`No recommendation available for evaluation ${previousEvaluation}`)
    }
    
    return {
      word: recommendation.recommendation,
      bins: recommendation.bins,
      binSizes: recommendation.binSizes,
      variance: recommendation.distribution || 0,
      reason: recommendation.reason + (recommendation.cached ? " (cached)" : " (calculated)"),
      cached: recommendation.cached
    }
  }
  
  // STRATEGIC LOGIC FOR GUESSES 4 & 5: Single pass to maximize bins with minimum variance
  // If perfect separation exists, we'll find it naturally and return early; otherwise we optimize distribution
  if ((guessNumber === 4 || guessNumber === 5) && remainingWords.length > 2) {
    if (!silent) console.log(`   🎯 GUESS ${guessNumber} STRATEGY: Maximizing bins with optimal distribution (combined single pass)`)

    const bestChoice = findBestGuessSinglePass(remainingWords, allWords)
    
    if (bestChoice) {
      if (bestChoice.bins === remainingWords.length) {
        if (!silent) console.log(`   ✨ PERFECT SEPARATION FOUND: ${bestChoice.word} creates ${bestChoice.bins} bins!`)
      } else {
        if (!silent) console.log(`   🎯 OPTIMAL CHOICE: ${bestChoice.word} creates ${bestChoice.bins} bins with variance ${bestChoice.variance.toFixed(2)}`)
      }
      return bestChoice
    }
  }
  
  // DEFAULT LOGIC FOR GUESS 3 (and 6): Use remaining words only
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
 * @param {boolean} options.silent - Suppress console output (default: false)
 * @returns {Object} - Complete game results
 */
const autoPlayWordle = async (answer, initialGuess = 'CRATE', options = {}) => {
  const { generateFullCache = false, silent = false } = options
  
  if (!silent) console.log(`\n🎮 AUTO-PLAYING WORDLE`)
  if (!silent) console.log(`=======================`)
  if (!silent) console.log(`Target: ${answer}`)
  if (!silent) console.log(`Starting guess: ${initialGuess}`)
  
  const gameState = {
    guesses: [],
    evaluations: [],
    remainingWords: [...likelyWords],
    solved: false,
    totalGuesses: 0
  }
  
  // GUESS 1: Initial guess
  if (!silent) console.log(`\n1️⃣ GUESS 1: ${initialGuess}`)
  const firstEvaluation = evaluateToString(initialGuess, answer)
  if (!silent) console.log(`   Evaluation: ${firstEvaluation}`)
  
  gameState.guesses.push(initialGuess)
  gameState.evaluations.push(firstEvaluation)
  gameState.totalGuesses++
  
  // Check if solved in 1
  if (firstEvaluation === 'GGGGG') {
    if (!silent) console.log(`🎉 SOLVED IN 1 GUESS!`)
    gameState.solved = true
    gameState.remainingWords = [answer]
    return gameState
  }
  
  // Filter after first guess
  gameState.remainingWords = getAnswersMatchingKey(initialGuess, firstEvaluation, gameState.remainingWords)
  if (!silent) console.log(`   Remaining: ${gameState.remainingWords.length} words`)
  
  // GUESS 2: Use consolidated chooseBestGuessFromRemaining function
  if (!silent) console.log(`\n2️⃣ GUESS 2: Determining strategy`)
  
  const secondGuessChoice = await chooseBestGuessFromRemaining(
    gameState.remainingWords,
    2,
    likelyWords,
    {
      previousGuess: initialGuess,
      previousEvaluation: firstEvaluation,
      generateFullCache: generateFullCache || false,
      silent
    }
  )
  
  const secondGuess = secondGuessChoice.word
  const secondEvaluation = evaluateToString(secondGuess, answer)
  if (!silent) console.log(`   Word: ${secondGuess}`)
  if (!silent) console.log(`   Evaluation: ${secondEvaluation}`)
  if (!silent) console.log(`   Strategy: ${secondGuessChoice.reason}`)
  
  gameState.guesses.push(secondGuess)
  gameState.evaluations.push(secondEvaluation)
  gameState.totalGuesses++
  
  // Check if solved in 2
  if (secondEvaluation === 'GGGGG') {
    if (!silent) console.log(`🎉 SOLVED IN 2 GUESSES!`)
    gameState.solved = true
    gameState.remainingWords = [answer]
    return gameState
  }
  
  // Filter after second guess
  gameState.remainingWords = getAnswersMatchingKey(secondGuess, secondEvaluation, gameState.remainingWords)
  if (!silent) console.log(`   Remaining: ${gameState.remainingWords.length} words`)
  
  // GUESS 3+: Use getBins strategy for remaining guesses
  let guessNumber = 3
  const maxGuesses = 6 // Wordle limit: 6 guesses maximum
  
  while (!gameState.solved && guessNumber <= maxGuesses) {
    if (!silent) console.log(`\n${guessNumber}️⃣ GUESS ${guessNumber}: Choosing from ${gameState.remainingWords.length} remaining words`)
    
    if (gameState.remainingWords.length === 0) {
      if (!silent) console.log(`❌ ERROR: No remaining words - target "${answer}" may not be in word list`)
      break
    }
    
    // Show remaining words if there are few enough
    if (!silent && gameState.remainingWords.length <= 10) {
      if (!silent) console.log(`   Remaining options: ${gameState.remainingWords.join(', ')}`)
    }
    
    // Choose best guess using consolidated strategy function
    const bestChoice = await chooseBestGuessFromRemaining(gameState.remainingWords, guessNumber, likelyWords, { silent })
    const currentGuess = bestChoice.word
    const currentEvaluation = evaluateToString(currentGuess, answer)
    
    if (!silent) console.log(`   Word: ${currentGuess}`)
    if (!silent) console.log(`   Evaluation: ${currentEvaluation}`)
    if (!silent) console.log(`   Strategy: ${bestChoice.reason}`)
    
    gameState.guesses.push(currentGuess)
    gameState.evaluations.push(currentEvaluation)
    gameState.totalGuesses++
    
    // Check if solved
    if (currentEvaluation === 'GGGGG') {
      if (!silent) console.log(`🎉 SOLVED IN ${guessNumber} GUESSES!`)
      gameState.solved = true
      gameState.remainingWords = [answer]
      break
    }
    
    // Filter for next iteration
    gameState.remainingWords = getAnswersMatchingKey(currentGuess, currentEvaluation, gameState.remainingWords)
    if (!silent) console.log(`   Remaining: ${gameState.remainingWords.length} words`)
    
    guessNumber++
  }
  
  if (!gameState.solved && guessNumber > maxGuesses) {
    if (!silent) console.log(`❌ FAILED: Exceeded maximum of ${maxGuesses} guesses`)
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
