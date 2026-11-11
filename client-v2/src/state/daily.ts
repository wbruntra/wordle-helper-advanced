import { computed, signal } from '@preact/signals'
import { evaluate, WORD_LENGTH, type Guess } from '@wordle/shared'
import { puzzle } from './answers'
import { persistedSignal } from './persisted'

export const MAX_GUESSES = 6

/** Words guessed per puzzle date. Colours aren't stored: they're derived from the answer. */
const gamesByDate = persistedSignal<Record<string, string[]>>('dailyGames', {})

/** Letters typed for the guess in progress. */
export const draft = signal('')

export const dailyWords = computed(() =>
  puzzle.value ? (gamesByDate.value[puzzle.value.date] ?? []) : [],
)

export const dailyGuesses = computed<Guess[]>(() => {
  const answer = puzzle.value?.word
  return answer ? dailyWords.value.map((word) => ({ word, key: evaluate(word, answer) })) : []
})

export type DailyStatus = 'playing' | 'won' | 'lost'

export const dailyStatus = computed<DailyStatus>(() => {
  const guesses = dailyGuesses.value
  if (guesses.at(-1)?.key === 'G'.repeat(WORD_LENGTH)) return 'won'
  return guesses.length >= MAX_GUESSES ? 'lost' : 'playing'
})

const setWords = (words: string[]) => {
  const date = puzzle.value?.date
  if (date) gamesByDate.value = { ...gamesByDate.value, [date]: words }
}

export function typeLetter(letter: string) {
  if (dailyStatus.value === 'playing' && draft.value.length < WORD_LENGTH) draft.value += letter
}

/** Delete a typed letter, or undo the last submitted guess when nothing is being typed. */
export function backspace() {
  if (draft.value) draft.value = draft.value.slice(0, -1)
  else setWords(dailyWords.value.slice(0, -1))
}

export function submitDraft() {
  if (!puzzle.value || dailyStatus.value !== 'playing' || draft.value.length !== WORD_LENGTH)
    return
  setWords([...dailyWords.value, draft.value])
  draft.value = ''
}

export function restartDaily() {
  draft.value = ''
  setWords([])
}
