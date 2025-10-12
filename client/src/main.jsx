import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import './styles/bootstrap.scss'
import './styles/index.scss'

import Wordle from './Wordle.jsx'
import { RouterProvider, createHashRouter } from 'react-router-dom'
import { Provider } from 'react-redux'
import { store } from './redux/store.js'

const router = createHashRouter([
  {
    path: '/',
    element: <Wordle />,
  },
  {
    path: '*',
    element: <Wordle />,
  },
])

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
      <RouterProvider router={router} />
    </Provider>
  </StrictMode>,
)
