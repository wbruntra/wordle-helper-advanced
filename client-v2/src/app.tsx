import { useEffect } from 'preact/hooks'
import { AutoPlayPage } from './pages/AutoPlayPage'
import { CustomPage } from './pages/CustomPage'
import { HomePage } from './pages/HomePage'
import { loadRecentAnswers } from './state/answers'
import { path } from './state/router'

export function App() {
  useEffect(() => {
    loadRecentAnswers()
  }, [])

  switch (path.value) {
    case '/custom':
      return <CustomPage />
    case '/auto-play':
      return <AutoPlayPage />
    default:
      return <HomePage />
  }
}
