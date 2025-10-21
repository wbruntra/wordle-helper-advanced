import { createSlice } from '@reduxjs/toolkit'
import { getCanonical, getCanonicalKey } from '../advancedUtils'

const initialState = {
  guesses: [],
}

const gameSlice = createSlice({
  name: 'game',
  initialState,
  reducers: {
    addGuess: (state, action) => {
      const { word, key } = action.payload
      state.guesses.push({
        word: getCanonical(word),
        key: getCanonicalKey(key),
      })
    },

    removeGuess: (state, action) => {
      const index = action.payload
      state.guesses.splice(index, 1)
    },

    updateGuess: (state, action) => {
      const { index, word, key } = action.payload
      state.guesses[index] = {
        word: getCanonical(word),
        key: getCanonicalKey(key),
      }
    },

    resetGuesses: (state) => {
      state.guesses = []
    },

    setGuesses: (state, action) => {
      state.guesses = action.payload
    },
  },
})

export const { addGuess, removeGuess, updateGuess, resetGuesses, setGuesses } = gameSlice.actions
export default gameSlice.reducer