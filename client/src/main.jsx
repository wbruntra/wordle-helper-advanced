import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import './styles/bootstrap.scss'
import './styles/index.scss'

import Wordle from './Wordle.jsx'
import TestPage from './TestPage.tsx'
import AutoPlayPage from './AutoPlayPage.jsx'
import { RouterProvider, createHashRouter } from 'react-router-dom'
import { Provider } from 'react-redux'
import { store } from './redux/store.ts'
import { ThemeProvider } from 'react-bootstrap'
import { TRPCProvider } from './TRPCProvider.tsx'

const router = createHashRouter([
  {
    path: '/',
    element: <Wordle />,
  },
  {
    path: '/test-page',
    element: <TestPage />,
  },
  {
    path: '/auto-play',
    element: <AutoPlayPage />,
  },
  {
    path: '*',
    element: <Wordle />,
  },
])

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
      <ThemeProvider theme="dark">
        <TRPCProvider>
          <RouterProvider router={router} />
        </TRPCProvider>
      </ThemeProvider>
    </Provider>
  </StrictMode>,
)
