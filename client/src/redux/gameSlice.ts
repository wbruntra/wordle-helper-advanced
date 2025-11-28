import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { getCanonical, getCanonicalKey } from '../advancedUtils'
import type { GameState, Guess } from './types'

const initialState: GameState = {
  guesses: [],
  useTodaysWord: true,
  todaysWord: null,
  todaysWordDate: null,
}

interface AddGuessPayload {
  word: string
  key: string
}

interface UpdateGuessPayload {
  index: number
  word: string
  key: string
}

const gameSlice = createSlice({
  name: 'game',
  initialState,
  reducers: {
    addGuess: (state, action: PayloadAction<AddGuessPayload>) => {
      const { word, key } = action.payload
      state.guesses.push({
        word: getCanonical(word),
        key: getCanonicalKey(key),
      })
    },

    removeGuess: (state, action: PayloadAction<number>) => {
      const index = action.payload
      state.guesses.splice(index, 1)
    },

    updateGuess: (state, action: PayloadAction<UpdateGuessPayload>) => {
      const { index, word, key } = action.payload
      state.guesses[index] = {
        word: getCanonical(word),
        key: getCanonicalKey(key),
      }
    },

    resetGuesses: (state) => {
      state.guesses = []
    },

    setGuesses: (state, action: PayloadAction<Guess[]>) => {
      state.guesses = action.payload
    },

    setUseTodaysWord: (state, action: PayloadAction<boolean>) => {
      state.useTodaysWord = action.payload
    },

    setTodaysWord: (state, action: PayloadAction<string | null>) => {
      state.todaysWord = action.payload
    },

    setTodaysWordDate: (state, action: PayloadAction<string | null>) => {
      state.todaysWordDate = action.payload
    },
  },
})

export const { addGuess, removeGuess, updateGuess, resetGuesses, setGuesses, setUseTodaysWord, setTodaysWord, setTodaysWordDate } = gameSlice.actions
export default gameSlice.reducer
