import { initTRPC } from '@trpc/server'
import { z } from 'zod'
import likelyWords from '@/likely-word-list.json'
import { chooseBestGuessFromRemaining, autoPlayWordle } from '@/auto-play-wordle'
import db from '@/db_connect'

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

  // Fetch recent Wordle answers from history
  getRecentAnswers: t.procedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(100).default(10),
      })
    )
    .query(async ({ input }) => {
      try {
        const answers = await db('answer_history')
          .select('date', 'word')
          .orderBy('date', 'desc')
          .limit(input.limit)

        return {
          answers: answers.map((row) => ({
            date: row.date,
            word: row.word.toUpperCase(),
          })),
          error: null,
        }
      } catch (error: any) {
        return {
          answers: [],
          error: error.message || 'Failed to fetch recent answers',
        }
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
      })
    )
    .query(async ({ input }): Promise<{
      bestGuess: string | null
      remainingCount: number
      bins?: number
      reason?: string
      error: string | null
    }> => {
      const { history, guessNumber } = input

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

      // Derive previousGuess and previousEvaluation from the last entry in history
      const previousGuess = history.length > 0 ? history[history.length - 1].guess : undefined
      const previousEvaluation = history.length > 0 ? history[history.length - 1].evaluation : undefined

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

  // Auto-play Wordle with full solving capability
  autoPlay: t.procedure
    .input(
      z.object({
        answer: z.string().length(5).toUpperCase(),
        startingWord: z.string().length(5).toUpperCase().optional(),
      })
    )
    .mutation(async ({ input }): Promise<{
      solved: boolean
      totalGuesses: number
      guesses: string[]
      evaluations: string[]
      steps: Array<{
        guessNumber: number
        guess: string
        evaluation: string
        bins?: number
        strategy: string
        remainingWordsPreGuess: number
        remainingWordsPostGuess: number
      }>
      error: string | null
    }> => {
      const { answer, startingWord = 'CRATE' } = input

      try {
        // Call the auto-play function with silent mode
        const gameState = await autoPlayWordle(answer, startingWord, { silent: true })

        // Use the steps data if available, otherwise transform the game state
        const steps = gameState.steps || gameState.guesses.map((guess, index) => ({
          guessNumber: index + 1,
          guess: guess,
          evaluation: gameState.evaluations[index],
          strategy: '',
          remainingWordsPreGuess: 0,
          remainingWordsPostGuess: 0,
        }))

        return {
          solved: gameState.solved,
          totalGuesses: gameState.totalGuesses,
          guesses: gameState.guesses,
          evaluations: gameState.evaluations,
          steps: steps as Array<{
            guessNumber: number
            guess: string
            evaluation: string
            bins?: number
            strategy: string
            remainingWordsPreGuess: number
            remainingWordsPostGuess: number
          }>,
          error: null,
        }
      } catch (error: any) {
        return {
          solved: false,
          totalGuesses: 0,
          guesses: [],
          evaluations: [],
          steps: [],
          error: error.message || 'Failed to auto-play Wordle',
        }
      }
    }),
})

// Export type router for client
export type AppRouter = typeof appRouter

// Create procedure for context
export const createTRPCContext = (): Context => {
  return {}
}