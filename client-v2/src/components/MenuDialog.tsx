import {
  answersStatus,
  isLatestPuzzle,
  puzzle,
  recentAnswers,
  selectedDate,
  showAnswer,
} from '../state/answers'
import { restartDaily } from '../state/daily'
import { href } from '../state/router'
import { formatPuzzleDate } from '../lib/format'
import { Modal } from './ui/Modal'
import './MenuDialog.css'

/** Daily-puzzle settings: which puzzle to play, answer reveal, and links to the other tools. */
export function MenuDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const current = puzzle.value

  return (
    <Modal open={open} onClose={onClose} title="Menu">
      <div class="field">
        <label for="puzzle-date">Puzzle</label>
        {answersStatus.value === 'loading' ? (
          <p class="muted">
            <span class="spinner" /> Loading puzzles…
          </p>
        ) : recentAnswers.value.length === 0 ? (
          <p class="notice notice-error">No puzzles available.</p>
        ) : (
          <select
            id="puzzle-date"
            value={current?.date}
            onChange={(e) => {
              selectedDate.value = e.currentTarget.value
              onClose()
            }}
          >
            {recentAnswers.value.map((p, i) => (
              <option key={p.date} value={p.date}>
                {formatPuzzleDate(p.date, i === 0)}
              </option>
            ))}
          </select>
        )}
        {!isLatestPuzzle.value && current && (
          <p class="field-hint">You’re playing an older puzzle.</p>
        )}
      </div>

      <label class="switch">
        <span>
          Show the answer
          {showAnswer.value && current && (
            <strong class="mono menu-answer"> {current.word}</strong>
          )}
        </span>
        <input
          type="checkbox"
          checked={showAnswer.value}
          onChange={(e) => (showAnswer.value = e.currentTarget.checked)}
        />
      </label>

      <button
        class="btn btn-block"
        onClick={() => {
          restartDaily()
          onClose()
        }}
      >
        Start this puzzle over
      </button>

      <nav class="menu-links">
        <a class="btn btn-block" href={href('/custom')} onClick={onClose}>
          Custom puzzle
        </a>
        <a class="btn btn-block" href={href('/auto-play')} onClick={onClose}>
          Auto-play
        </a>
      </nav>
    </Modal>
  )
}
