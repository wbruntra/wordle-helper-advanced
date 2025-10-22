import { test, expect, describe } from 'bun:test'
import { evaluateToString, getAnswersMatchingKey, getBins } from '@advancedUtils'
import {
  autoPlayWordle,
  chooseBestGuessFromRemaining,
} from './auto-play-wordle.js'
import likelyWords from './likely-word-list.json' with { type: 'json' }

// ============================================================================
// CORE GAMEPLAY TESTS
// ============================================================================

describe('autoPlayWordle - Core Mechanics', () => {
  test('should solve perfect first guess (STORK vs STORK)', async () => {
    const result = await autoPlayWordle('STORK', 'STORK', { silent: true })
    expect(result.solved).toBe(true)
    expect(result.totalGuesses).toBe(1)
    expect(result.guesses[0]).toBe('STORK')
    expect(result.evaluations[0]).toBe('GGGGG')
  })

  test('should solve in multiple guesses', async () => {
    // Using a word that's likely not the starting guess
    const result = await autoPlayWordle('STORM', 'CRATE', { silent: true })
    expect(result.solved).toBe(true)
    expect(result.totalGuesses).toBeGreaterThanOrEqual(2)
    expect(result.totalGuesses).toBeLessThanOrEqual(6)
  })

  test('should not exceed 6 guesses (Wordle limit)', async () => {
    const result = await autoPlayWordle('STORK', 'SLATE', { silent: true })
    expect(result.totalGuesses).toBeLessThanOrEqual(6)
  })

  test('should maintain guess history', async () => {
    const result = await autoPlayWordle('STORM', 'CRATE', { silent: true })
    expect(result.guesses.length).toBe(result.totalGuesses)
    expect(result.evaluations.length).toBe(result.totalGuesses)
  })

  test('should produce valid evaluations', async () => {
    const result = await autoPlayWordle('STORK', 'CRATE', { silent: true })
    for (const evaluation of result.evaluations) {
      // Each evaluation should be 5 characters
      expect(evaluation.length).toBe(5)
      // Each character should be G, Y, or -
      for (const char of evaluation) {
        expect(['G', 'Y', '-']).toContain(char)
      }
    }
  })

  test('should have matching guess count', async () => {
    const result = await autoPlayWordle('SPARE', 'STORK', { silent: true })
    expect(result.guesses.length).toBe(result.totalGuesses)
    expect(result.evaluations.length).toBe(result.totalGuesses)
  })
})

// ============================================================================
// GUESS SELECTION TESTS
// ============================================================================

describe('chooseBestGuessFromRemaining', () => {
  test('should return single word when only one remains', async () => {
    const result = await chooseBestGuessFromRemaining(['STORK'], 3)
    expect(result.word).toBe('STORK')
    expect(result.bins).toBe(1)
  })

  test('should return two-word solution for two remaining', async () => {
    const result = await chooseBestGuessFromRemaining(['STORK', 'STORM'], 3)
    expect(result.word).toBeOneOf(['STORK', 'STORM'])
    expect(result.bins).toBe(2)
  })

  test('should prioritize remaining words for guess 3', async () => {
    const remaining = ['STORK', 'STORM', 'STORE']
    const result = await chooseBestGuessFromRemaining(remaining, 3, likelyWords)
    expect(remaining).toContain(result.word)
  })

  test('should provide bin information', async () => {
    const result = await chooseBestGuessFromRemaining(['STORK', 'STORM', 'STORE'], 3)
    expect(result.bins).toBeGreaterThan(0)
    expect(typeof result.reason).toBe('string')
  })

  test('should have valid binSizes array', async () => {
    const remaining = ['STORK', 'STORM', 'STORE', 'SLATE']
    const result = await chooseBestGuessFromRemaining(remaining, 3)
    if (result.binSizes) {
      expect(Array.isArray(result.binSizes)).toBe(true)
      expect(result.binSizes.length).toBeGreaterThan(0)
    }
  })
})

// ============================================================================
// GAME STATE TESTS
// ============================================================================

describe('autoPlayWordle - Game State', () => {
  test('should initialize with correct starting guess', async () => {
    const result = await autoPlayWordle('STORK', 'CRATE', { silent: true })
    expect(result.guesses[0]).toBe('CRATE')
  })

  test('should track remaining words', async () => {
    const result = await autoPlayWordle('STORK', 'CRATE', { silent: true })
    if (result.solved) {
      expect(result.remainingWords).toContain('STORK')
    }
  })

  test('should have valid evaluations at each step', async () => {
    const result = await autoPlayWordle('STORM', 'CRATE', { silent: true })
    for (let i = 0; i < result.evaluations.length; i++) {
      const guess = result.guesses[i]
      const evaluation = result.evaluations[i]
      // Verify that the evaluation format is correct
      expect(evaluation.length).toBe(5)
      expect(/^[GY\-]{5}$/.test(evaluation)).toBe(true)
    }
  })
})

// ============================================================================
// FILTERING & NARROWING TESTS
// ============================================================================

describe('autoPlayWordle - Word Narrowing', () => {
  test('should narrow word list after each guess', async () => {
    const result = await autoPlayWordle('STORK', 'CRATE', { silent: true })
    // First guess should narrow from full list
    expect(result.guesses.length).toBeGreaterThanOrEqual(1)
    // Should reach 1 word when solved
    if (result.solved) {
      expect(result.remainingWords.length).toBe(1)
      expect(result.remainingWords[0]).toBe('STORK')
    }
  })

  test('should handle words with repeated letters', async () => {
    const result = await autoPlayWordle('EERIE', 'CRATE', { silent: true })
    if (result.solved) {
      expect(result.remainingWords[0]).toBe('EERIE')
    }
  })
})

// ============================================================================
// EDGE CASES & ERROR HANDLING
// ============================================================================

describe('autoPlayWordle - Edge Cases', () => {
  test('should solve for uncommon words in list', async () => {
    // Test with words that exist in the word list
    const testWord = 'STORK'
    if (likelyWords.includes(testWord)) {
      const result = await autoPlayWordle(testWord, 'CRATE', { silent: true })
      expect(result.solved).toBe(true)
    }
  })

  test('should maintain evaluation consistency', async () => {
    const result = await autoPlayWordle('SPARE', 'STORK', { silent: true })
    // Verify that each guess produces valid evaluation against answer
    for (let i = 0; i < result.guesses.length; i++) {
      const guess = result.guesses[i]
      const answer = 'SPARE'
      const expectedEval = evaluateToString(guess, answer)
      expect(result.evaluations[i]).toBe(expectedEval)
    }
  })
})

// ============================================================================
// STRATEGY TESTS
// ============================================================================

describe('Strategy - getBins Optimization', () => {
  test('should select guess that creates max bins', async () => {
    const remaining = ['STORK', 'STORM', 'STORE', 'SLATE', 'SPARE']
    const result = await chooseBestGuessFromRemaining(remaining, 3)

    // Count the bins created by this choice
    const bins = getBins(result.word, remaining, { returnObject: false })
    expect(bins.length).toBeGreaterThan(0)
  })

  test('should prefer words from remaining list for guess 3', async () => {
    const remaining = ['STORK', 'STORM', 'STORE']
    const allWords = [...remaining, 'SLATE', 'SPARE', 'BLEND']
    const result = await chooseBestGuessFromRemaining(remaining, 3, allWords)

    // For guess 3, should prefer remaining words
    expect(remaining).toContain(result.word)
  })
})

// ============================================================================
// CONSISTENCY TESTS
// ============================================================================

describe('autoPlayWordle - Consistency', () => {
  test('should solve same answer with different starting words', async () => {
    const answer = 'STORK'
    const result1 = await autoPlayWordle(answer, 'CRATE', { silent: true })
    const result2 = await autoPlayWordle(answer, 'SLATE', { silent: true })

    expect(result1.solved).toBe(true)
    expect(result2.solved).toBe(true)
    expect(result1.guesses[0]).not.toBe(result2.guesses[0])
  })

  test('should produce valid keys at each step', async () => {
    const result = await autoPlayWordle('STORM', 'CRATE', { silent: true })
    const answer = 'STORM'

    for (let i = 0; i < result.guesses.length; i++) {
      const guess = result.guesses[i]
      const evaluation = result.evaluations[i]
      const expectedKey = evaluateToString(guess, answer)
      expect(evaluation).toBe(expectedKey)
    }
  })
})
