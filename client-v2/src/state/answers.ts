import { computed, signal } from '@preact/signals'
import type { PuzzleAnswer } from '@wordle/shared'
import { api } from '../api/client'
import { persistedSignal } from './persisted'

/** Recent puzzle answers, newest first. */
export const recentAnswers = signal<PuzzleAnswer[]>([])
export const answersStatus = signal<'idle' | 'loading' | 'ready' | 'error'>('idle')

/** Date of the puzzle being played, or `null` for the latest one. */
export const selectedDate = persistedSignal<string | null>('selectedDate', null)

/** Whether the answer is revealed in the UI before the puzzle is finished. */
export const showAnswer = persistedSignal('showAnswer', false)

/** The puzzle being played: the selected date if known, otherwise the latest. */
export const puzzle = computed<PuzzleAnswer | null>(
  () => recentAnswers.value.find((p) => p.date === selectedDate.value) ?? recentAnswers.value[0] ?? null,
)

export const isLatestPuzzle = computed(() => puzzle.value !== null && puzzle.value === recentAnswers.value[0])

export async function loadRecentAnswers(limit = 14) {
  if (answersStatus.value === 'loading' || answersStatus.value === 'ready') return
  answersStatus.value = 'loading'
  try {
    recentAnswers.value = (await api.recentAnswers(limit)).answers
    answersStatus.value = 'ready'
  } catch (error) {
    console.error('Failed to load recent answers', error)
    answersStatus.value = 'error'
  }
}
