/**
 * Typed access to the wordle-helper API. Request and response shapes come from
 * the contract in `@wordle/shared`, which the server implements.
 */
import type {
  ApiError,
  AutoPlayRequest,
  AutoPlayResponse,
  BestGuessRequest,
  BestGuessResponse,
  Guess,
  InterpretGuessesRequest,
  InterpretGuessesResponse,
  PresignedUrlRequest,
  PresignedUrlResponse,
  RecentAnswersResponse,
} from '@wordle/shared'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, init)
  const body = (await response.json().catch(() => null)) as T | ApiError | null
  if (!response.ok) {
    throw new Error((body as ApiError | null)?.error ?? `Request failed (${response.status})`)
  }
  return body as T
}

const post = <T>(path: string, body: unknown) =>
  request<T>(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

export const api = {
  recentAnswers: (limit: number) => request<RecentAnswersResponse>(`/answers?limit=${limit}`),

  /** The solver's best next guess after the guesses in `history`. */
  bestGuess: (history: Guess[]) =>
    post<BestGuessResponse>('/best-guess', { history } satisfies BestGuessRequest),

  autoPlay: (answer: string, startingWord?: string) =>
    post<AutoPlayResponse>('/auto-play', { answer, startingWord } satisfies AutoPlayRequest),

  presignedUrl: (file: { name: string; type: string }) =>
    post<PresignedUrlResponse>('/get-presigned-url', {
      fileName: file.name,
      fileType: file.type,
    } satisfies PresignedUrlRequest),

  interpretGuesses: (fileUrl: string) =>
    post<InterpretGuessesResponse>('/interpret-guesses', {
      fileUrl,
    } satisfies InterpretGuessesRequest),
}
