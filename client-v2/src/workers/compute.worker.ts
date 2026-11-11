/**
 * Runs the expensive solver computations off the main thread so the UI stays
 * responsive. Requests and responses are matched by `id`.
 */
import { analyzeTurn, type TurnAnalysis } from '../lib/analysis'
import { rankGuesses, type RankedWord } from '../lib/ranking'
import type { Guess } from '@wordle/shared'

export type ComputeRequest =
  | { id: number; type: 'rank'; remaining: string[]; allWords: string[]; includeAllWords: boolean }
  | { id: number; type: 'analyzeTurns'; words: string[]; guesses: Guess[] }

export type ComputeResult =
  | { id: number; type: 'rank'; ranked: RankedWord[] }
  | { id: number; type: 'turn'; index: number; analysis: TurnAnalysis }
  | { id: number; type: 'done' }
  | { id: number; type: 'error'; message: string }

self.onmessage = (event: MessageEvent<ComputeRequest>) => {
  const request = event.data
  try {
    if (request.type === 'rank') {
      const ranked = rankGuesses(request.remaining, request.allWords, request.includeAllWords)
      self.postMessage({ id: request.id, type: 'rank', ranked } satisfies ComputeResult)
    } else {
      request.guesses.forEach((_guess, index) => {
        const analysis = analyzeTurn(request.words, request.guesses, index)
        self.postMessage({ id: request.id, type: 'turn', index, analysis } satisfies ComputeResult)
      })
      self.postMessage({ id: request.id, type: 'done' } satisfies ComputeResult)
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    self.postMessage({ id: request.id, type: 'error', message } satisfies ComputeResult)
  }
}
