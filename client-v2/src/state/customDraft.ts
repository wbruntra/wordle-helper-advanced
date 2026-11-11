import { signal } from '@preact/signals'
import { WORD_LENGTH } from '@wordle/shared'
import { MAX_GUESSES } from './daily'
import { addCustomGuess, customGuesses, removeLastCustomGuess } from './custom'

/** Letters typed and the colour chosen for each, for the custom guess in progress. */
export const customWord = signal('')
export const customKey = signal('-----')

export function typeCustomLetter(letter: string) {
  if (customWord.value.length < WORD_LENGTH && customGuesses.value.length < MAX_GUESSES) customWord.value += letter
}

export function customBackspace() {
  if (customWord.value) {
    customKey.value = customKey.value.slice(0, customWord.value.length - 1).padEnd(WORD_LENGTH, '-')
    customWord.value = customWord.value.slice(0, -1)
  } else {
    removeLastCustomGuess()
  }
}

/** Cycle a tile through grey -> yellow -> green -> grey. */
export function cycleCustomTile(index: number) {
  if (index >= customWord.value.length) return
  const next = { '-': 'Y', Y: 'G', G: '-' }[customKey.value[index]] ?? '-'
  customKey.value = customKey.value.slice(0, index) + next + customKey.value.slice(index + 1)
}

export function submitCustomDraft() {
  if (customWord.value.length !== WORD_LENGTH) return
  addCustomGuess({ word: customWord.value, key: customKey.value })
  customWord.value = ''
  customKey.value = '-----'
}
