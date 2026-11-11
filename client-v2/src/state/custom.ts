import { normalizeKey, normalizeWord, type Guess } from '@wordle/shared'
import { persistedSignal } from './persisted'

/** Guesses (word + colours) entered by hand on the custom page. */
export const customGuesses = persistedSignal<Guess[]>('customGuesses', [])

const clean = (guess: Guess): Guess => ({ word: normalizeWord(guess.word), key: normalizeKey(guess.key) })

export const addCustomGuess = (guess: Guess) => {
  customGuesses.value = [...customGuesses.value, clean(guess)]
}

export const removeLastCustomGuess = () => {
  customGuesses.value = customGuesses.value.slice(0, -1)
}

export const replaceCustomGuesses = (next: Guess[]) => {
  customGuesses.value = next.map(clean)
}

export const clearCustomGuesses = () => {
  customGuesses.value = []
}
