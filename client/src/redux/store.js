import { configureStore } from '@reduxjs/toolkit'
import uiSlice from './uiSlice'
import gameSlice from './gameSlice'

const rootReducer = {
  ui: uiSlice,
  game: gameSlice,
}

export const store = configureStore({
  reducer: rootReducer,
})
