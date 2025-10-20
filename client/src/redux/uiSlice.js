import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  theme: 'light', // Example UI state
  isSidebarOpen: false,
  modals: {
    wordList: false,
    upload: false,
    analysis: false,
  },
}

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleSidebar(state) {
      state.isSidebarOpen = !state.isSidebarOpen
    },
    setTheme(state, action) {
      state.theme = action.payload
    },
    toggleModal(state, action) {
      const modalName = action.payload
      if (Object.prototype.hasOwnProperty.call(state.modals, modalName)) {
        state.modals[modalName] = !state.modals[modalName]
      }
    },
    setModalState(state, action) {
      const { modalName, isOpen } = action.payload
      if (Object.prototype.hasOwnProperty.call(state.modals, modalName)) {
        state.modals[modalName] = isOpen
      }
    },
    closeAllModals(state) {
      Object.keys(state.modals).forEach(key => {
        state.modals[key] = false
      })
    },
  },
})

export const { toggleSidebar, setTheme, toggleModal, setModalState, closeAllModals } = uiSlice.actions
export default uiSlice.reducer