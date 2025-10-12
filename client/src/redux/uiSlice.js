import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  theme: 'light', // Example UI state
  isSidebarOpen: false,
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
  },
})

export const { toggleSidebar, setTheme } = uiSlice.actions
export default uiSlice.reducer