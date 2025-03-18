import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import './styles/bootstrap.scss'
import './styles/index.scss'

import Wordle from './Wordle.jsx'
import FileUpload from './FileUpload.jsx'
import { RouterProvider, createHashRouter } from 'react-router-dom'

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
    <RouterProvider router={router} />
  </StrictMode>,
)
