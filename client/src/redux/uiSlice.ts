import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { UIState } from './types'

const initialState: UIState = {
  theme: 'light',
  isSidebarOpen: false,
  modals: {
    wordList: false,
    upload: false,
    analysis: false,
  },
}

interface SetModalStatePayload {
  modalName: keyof UIState['modals']
  isOpen: boolean
}

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleSidebar(state) {
      state.isSidebarOpen = !state.isSidebarOpen
    },
    setTheme(state, action: PayloadAction<'light' | 'dark'>) {
      state.theme = action.payload
    },
    toggleModal(state, action: PayloadAction<keyof UIState['modals']>) {
      const modalName = action.payload
      if (Object.prototype.hasOwnProperty.call(state.modals, modalName)) {
        state.modals[modalName] = !state.modals[modalName]
      }
    },
    setModalState(state, action: PayloadAction<SetModalStatePayload>) {
      const { modalName, isOpen } = action.payload
      if (Object.prototype.hasOwnProperty.call(state.modals, modalName)) {
        state.modals[modalName] = isOpen
      }
    },
    closeAllModals(state) {
      Object.keys(state.modals).forEach(key => {
        state.modals[key as keyof UIState['modals']] = false
      })
    },
  },
})

export const { toggleSidebar, setTheme, toggleModal, setModalState, closeAllModals } = uiSlice.actions
export default uiSlice.reducer
