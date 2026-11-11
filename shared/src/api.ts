/**
 * The HTTP API contract, shared by the server (which implements it) and the
 * client (which calls it). Every endpoint returns JSON; failures are a non-2xx
 * status with an `ApiError` body.
 */
import type { Guess } from './wordle'

export interface ApiError {
  error: string
}

/** GET /api/answers?limit=N — recent puzzle answers, newest first. */
export interface PuzzleAnswer {
  date: string
  word: string
}
export interface RecentAnswersResponse {
  answers: PuzzleAnswer[]
}

/** POST /api/best-guess — the solver's best next guess after `history` (at most 5 guesses). */
export interface BestGuessRequest {
  history: Guess[]
}
export interface BestGuessResponse {
  bestGuess: string
  remainingCount: number
  bins?: number
  reason?: string
}

/** POST /api/auto-play — let the solver play a puzzle. */
export interface AutoPlayRequest {
  answer: string
  startingWord?: string
}
export interface AutoPlayStep {
  guessNumber: number
  guess: string
  evaluation: string
  bins?: number
  strategy: string
  remainingWordsPreGuess: number
  remainingWordsPostGuess: number
}
export interface AutoPlayResponse {
  solved: boolean
  totalGuesses: number
  steps: AutoPlayStep[]
}

/** POST /api/get-presigned-url — where to upload a screenshot. */
export interface PresignedUrlRequest {
  fileName: string
  fileType: string
}
export interface PresignedUrlResponse {
  presignedUrl: string
  fileUrl: string
}

/** POST /api/interpret-guesses — read the guesses out of an uploaded screenshot. */
export interface InterpretGuessesRequest {
  fileUrl: string
}
export type InterpretGuessesResponse = Guess[]
