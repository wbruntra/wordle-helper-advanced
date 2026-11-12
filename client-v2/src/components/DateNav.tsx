import { shiftIso, todayIso } from '../lib/dates'
import { formatPuzzleDate } from '../lib/format'
import { isLatestPuzzle, viewDate, viewedDate } from '../state/answers'
import { BackIcon, ForwardIcon } from './Icons'
import './DateNav.css'

/** The viewed puzzle date with arrows to step a day back or forward (never past today). */
export function DateNav() {
  const date = viewedDate.value
  if (!date) return null

  const go = (days: number) => viewDate(shiftIso(date, days))

  return (
    <span class="date-nav">
      <button class="date-nav-btn" onClick={() => go(-1)} aria-label="Previous day">
        <BackIcon />
      </button>
      <span class="date-nav-label">{formatPuzzleDate(date, isLatestPuzzle.value)}</span>
      <button
        class="date-nav-btn"
        onClick={() => go(1)}
        disabled={date >= todayIso()}
        aria-label="Next day"
      >
        <ForwardIcon />
      </button>
    </span>
  )
}
