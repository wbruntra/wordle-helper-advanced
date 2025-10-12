import { configureStore } from '@reduxjs/toolkit'
import uiSlice from './uiSlice'

const rootReducer = {
  ui: uiSlice,
}

export const store = configureStore({
  reducer: rootReducer,
})
