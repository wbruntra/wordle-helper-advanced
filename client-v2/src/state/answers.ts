import { computed, signal } from '@preact/signals'
import type { PuzzleAnswer } from '@wordle/shared'
import { api } from '../api/client'
import { todayIso } from '../lib/dates'
import { persistedSignal } from './persisted'

/** Recent puzzle answers, newest first. */
export const recentAnswers = signal<PuzzleAnswer[]>([])
export const answersStatus = signal<'idle' | 'loading' | 'ready' | 'error'>('idle')

/** Date chosen by the player, or `null` to follow the latest puzzle. */
const chosenDate = persistedSignal<string | null>('selectedDate', null)

/** The calendar date being viewed: the chosen one, else the latest puzzle's. */
export const viewedDate = computed<string | null>(
  () => chosenDate.value ?? recentAnswers.value[0]?.date ?? null,
)

/** Which puzzle to view. Picking the latest date goes back to following it. */
export function viewDate(date: string) {
  chosenDate.value = date === recentAnswers.value[0]?.date ? null : date
}

/** Whether the answer is revealed in the UI before the puzzle is finished. */
export const showAnswer = persistedSignal('showAnswer', false)

/** The puzzle for the viewed date, or `null` when none is recorded for it (or none has loaded). */
export const puzzle = computed<PuzzleAnswer | null>(
  () => recentAnswers.value.find((p) => p.date === viewedDate.value) ?? null,
)

export const isLatestPuzzle = computed(
  () => puzzle.value !== null && puzzle.value === recentAnswers.value[0],
)

/** Whether the newest known puzzle is older than today, so a newer one may exist. */
export const latestPuzzleIsStale = () => {
  const latest = recentAnswers.value[0]
  return answersStatus.value === 'ready' && (!latest || latest.date < todayIso())
}

/** The most the API returns in one request. */
const HISTORY_LIMIT = 100

/** Fetch the puzzle history. Unless `force`d, does nothing once loaded. */
export async function loadRecentAnswers(force = false) {
  if (answersStatus.value === 'loading' || (answersStatus.value === 'ready' && !force)) return
  // Keep showing the current puzzle while a refresh runs.
  if (answersStatus.value !== 'ready') answersStatus.value = 'loading'
  try {
    recentAnswers.value = (await api.recentAnswers(HISTORY_LIMIT)).answers
    answersStatus.value = 'ready'
  } catch (error) {
    console.error('Failed to load recent answers', error)
    // A failed refresh keeps what we already have.
    if (answersStatus.value !== 'ready') answersStatus.value = 'error'
  }
}
