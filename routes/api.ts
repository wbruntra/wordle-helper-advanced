import express, { type Request, type Response } from 'express'
import { z } from 'zod'
import {
  LIKELY_WORDS,
  applyGuesses,
  normalizeKey,
  normalizeWord,
  type ApiError,
  type AutoPlayResponse,
  type BestGuessResponse,
  type RecentAnswersResponse,
} from '@wordle/shared'
import { autoPlayWordle, chooseBestGuessFromRemaining } from '../auto-play-wordle'
import db from '../db_connect'

const router = express.Router()

const word = z.string().length(5).transform(normalizeWord)
const key = z.string().length(5).transform(normalizeKey)

const recentAnswersQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(10),
})

const bestGuessBody = z.object({
  // Guesses already played; the solver picks the next one (so at most 5).
  history: z.array(z.object({ word, key })).max(5),
})

const autoPlayBody = z.object({
  answer: word,
  startingWord: word.optional(),
})

/** Parse `data`, or answer 400 and return `null`. */
function parseOr400<T extends z.ZodType>(schema: T, data: unknown, res: Response<ApiError>) {
  const result = schema.safeParse(data)
  if (result.success) return result.data as z.output<T>
  res.status(400).json({ error: z.prettifyError(result.error) })
  return null
}

router.get('/api/answers', async (req: Request, res: Response<RecentAnswersResponse | ApiError>) => {
  const query = parseOr400(recentAnswersQuery, req.query, res)
  if (!query) return

  const rows = await db('answer_history').select('date', 'word').orderBy('date', 'desc').limit(query.limit)
  res.json({ answers: rows.map((row: { date: string; word: string }) => ({ date: row.date, word: row.word.toUpperCase() })) })
})

router.post('/api/best-guess', async (req: Request, res: Response<BestGuessResponse | ApiError>) => {
  const body = parseOr400(bestGuessBody, req.body, res)
  if (!body) return

  const { history } = body
  const remaining = applyGuesses(LIKELY_WORDS, history)
  if (remaining.length === 0) {
    res.status(422).json({ error: 'No matching words for the given history' })
    return
  }

  const previous = history.at(-1)
  const best = await chooseBestGuessFromRemaining(remaining, history.length + 1, LIKELY_WORDS, {
    previousGuess: previous?.word,
    previousEvaluation: previous?.key,
    generateFullCache: false,
    silent: true,
  })

  res.json({ bestGuess: best.word, remainingCount: remaining.length, bins: best.bins, reason: best.reason })
})

router.post('/api/auto-play', async (req: Request, res: Response<AutoPlayResponse | ApiError>) => {
  const body = parseOr400(autoPlayBody, req.body, res)
  if (!body) return

  const game = await autoPlayWordle(body.answer, body.startingWord ?? 'CRATE', { silent: true })
  const steps =
    game.steps ??
    game.guesses.map((guess, index) => ({
      guessNumber: index + 1,
      guess,
      evaluation: game.evaluations[index],
      strategy: '',
      remainingWordsPreGuess: 0,
      remainingWordsPostGuess: 0,
    }))

  res.json({ solved: game.solved, totalGuesses: game.totalGuesses, steps })
})

export default router
