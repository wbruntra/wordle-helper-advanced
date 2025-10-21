import { configureStore } from '@reduxjs/toolkit'
import uiSlice from './uiSlice'
import gameSlice from './gameSlice'
import type { RootState } from './types'

const rootReducer = {
  ui: uiSlice,
  game: gameSlice,
}

export const store = configureStore({
  reducer: rootReducer,
})

// Export RootState and AppDispatch types for use throughout the app
export type { RootState }
export type AppDispatch = typeof store.dispatch
