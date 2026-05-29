/**
 * Redux Store Types
 * Centralized type definitions for the Redux store
 */

/**
 * Game Slice Types
 */

export interface Guess {
  word: string
  key: string
}

export interface RecentAnswer {
  date: string
  word: string
}

export interface GameState {
  guesses: Guess[]
  recentAnswers: RecentAnswer[]
  selectedDateIndex: number
  showWord: boolean
}

/**
 * UI Slice Types
 */

export interface UIModals {
  wordList: boolean
  upload: boolean
  analysis: boolean
}

export interface UIState {
  theme: 'light' | 'dark'
  isSidebarOpen: boolean
  modals: UIModals
}

/**
 * Root State Type
 */

export interface RootState {
  ui: UIState
  game: GameState
}
