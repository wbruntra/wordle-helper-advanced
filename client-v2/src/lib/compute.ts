import type { ComputeRequest, ComputeResult } from '../workers/compute.worker'
import type { TurnAnalysis } from './analysis'
import type { RankedWord } from './ranking'
import type { Guess } from '@wordle/shared'

/**
 * Main-thread handle to the compute worker. Each call supersedes earlier ones
 * of the same kind: results for a stale request are dropped.
 */
let worker: Worker | null = null
let nextId = 1
const listeners = new Map<number, (result: ComputeResult) => void>()

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL('../workers/compute.worker.ts', import.meta.url), {
      type: 'module',
    })
    worker.onmessage = (event: MessageEvent<ComputeResult>) =>
      listeners.get(event.data.id)?.(event.data)
  }
  return worker
}

type DistributiveOmit<T, K extends keyof never> = T extends unknown ? Omit<T, K> : never

function start(
  request: DistributiveOmit<ComputeRequest, 'id'>,
  onResult: (r: ComputeResult) => void,
) {
  const id = nextId++
  listeners.set(id, onResult)
  getWorker().postMessage({ ...request, id })
  return () => void listeners.delete(id)
}

/** Rank guesses off-thread. Returns a cancel function. */
export function rankInWorker(
  remaining: string[],
  allWords: string[],
  includeAllWords: boolean,
  onDone: (ranked: RankedWord[]) => void,
  onError: (message: string) => void,
) {
  return start({ type: 'rank', remaining, allWords, includeAllWords }, (result) => {
    if (result.type === 'rank') onDone(result.ranked)
    else if (result.type === 'error') onError(result.message)
  })
}

/** Analyse every turn of a game off-thread, streaming each result as it lands. */
export function analyzeTurnsInWorker(
  words: string[],
  guesses: Guess[],
  onTurn: (index: number, analysis: TurnAnalysis) => void,
  onError: (message: string) => void,
) {
  return start({ type: 'analyzeTurns', words, guesses }, (result) => {
    if (result.type === 'turn') onTurn(result.index, result.analysis)
    else if (result.type === 'error') onError(result.message)
  })
}
