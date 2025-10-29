import { initTRPC } from '@trpc/server'
import { z } from 'zod'
import likelyWords from '@/likely-word-list.json'
import { chooseBestGuessFromRemaining } from '@/auto-play-wordle'

// Utility functions for word evaluation
const evaluateGuess = (guess: string, answer: string): string => {
  const key = Array(guess.length).fill(null)
  const answerArray = answer.split('')
  const guessArray = guess.split('')

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

const getAnswersMatchingKey = (guess: string, key: string, wordList: string[]): string[] => {
  const result = wordList.filter((word) => {
    const tempKey = evaluateGuess(guess, word)
    return key === tempKey
  })
  return result
}

// Create tRPC instance
const t = initTRPC.create()

// Define context type
export type Context = {
  // Add any context data here (user, database, etc.)
}

// Create router
export const appRouter = t.router({
  // Simple hello world route
  hello: t.procedure
    .input(
      z.object({
        name: z.string().optional(),
      })
    )
    .query(({ input }) => {
      return {
        greeting: `Hello ${input.name ?? 'World'}!`,
        timestamp: new Date().toISOString(),
      }
    }),

  // Test route for Wordle functionality
  getWordleStatus: t.procedure
    .query(() => {
      return {
        status: 'ready',
        message: 'Wordle helper is ready to use!',
        features: ['auto-play', 'solver', 'image-analysis'],
        version: '1.0.0',
      }
    }),

  // Route that takes a word and returns its evaluation
  evaluateWord: t.procedure
    .input(
      z.object({
        guess: z.string().length(5),
        answer: z.string().length(5),
      })
    )
    .query(({ input }) => {
      // Simple evaluation logic (we'll enhance this later)
      const { guess, answer } = input
      const evaluation = guess.split('').map((letter, index) => {
        if (answer[index] === letter) {
          return 'G' // Green - correct position
        } else if (answer.includes(letter)) {
          return 'Y' // Yellow - wrong position
        } else {
          return '-' // Black - not in word
        }
      }).join('')

      return {
        guess,
        answer,
        evaluation,
        isCorrect: evaluation === 'GGGGG',
      }
    }),

  // Get best next guess based on game history
  getBestGuess: t.procedure
    .input(
      z.object({
        history: z.array(
          z.object({
            guess: z.string().length(5),
            evaluation: z.string().length(5),
          })
        ),
        guessNumber: z.number().int().min(1).max(6),
        previousGuess: z.string().length(5).optional(),
        previousEvaluation: z.string().length(5).optional(),
      })
    )
    .query(async ({ input }): Promise<{
      bestGuess: string | null
      remainingCount: number
      bins?: number
      reason?: string
      error: string | null
    }> => {
      const { history, guessNumber, previousGuess, previousEvaluation } = input

      // Start with all likely words
      let remainingWords: string[] = [...likelyWords]

      // Filter based on history
      for (const { guess, evaluation } of history) {
        remainingWords = getAnswersMatchingKey(guess, evaluation, remainingWords)
      }

      // If no words remain, return error
      if (remainingWords.length === 0) {
        return {
          bestGuess: null,
          remainingCount: 0,
          error: 'No matching words for the given history',
        }
      }

      // Use the solver function to get the best guess
      const bestChoice = await chooseBestGuessFromRemaining(
        remainingWords,
        guessNumber,
        likelyWords,
        {
          previousGuess: previousGuess,
          previousEvaluation: previousEvaluation,
          generateFullCache: false,
          silent: true,
        }
      )

      return {
        bestGuess: bestChoice.word,
        remainingCount: remainingWords.length,
        bins: bestChoice.bins,
        reason: bestChoice.reason,
        error: null,
      }
    }),
})

// Export type router for client
export type AppRouter = typeof appRouter

// Create procedure for context
export const createTRPCContext = (): Context => {
  return {}
}