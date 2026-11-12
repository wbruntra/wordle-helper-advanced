import { useEffect } from 'preact/hooks'
import { AutoPlayPage } from './pages/AutoPlayPage'
import { CustomPage } from './pages/CustomPage'
import { HomePage } from './pages/HomePage'
import { latestPuzzleIsStale, loadRecentAnswers } from './state/answers'
import { path } from './state/router'

export function App() {
  useEffect(() => {
    loadRecentAnswers()
    // A page left open overnight is stale: reload the history when it comes back into view.
    const refresh = () => {
      if (document.visibilityState === 'visible' && latestPuzzleIsStale()) loadRecentAnswers(true)
    }
    document.addEventListener('visibilitychange', refresh)
    return () => document.removeEventListener('visibilitychange', refresh)
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
