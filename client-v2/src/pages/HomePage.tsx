import { useState } from 'preact/hooks'
import { GameScreen } from '../components/GameScreen'
import { MenuIcon } from '../components/Icons'
import { MenuDialog } from '../components/MenuDialog'
import { formatPuzzleDate } from '../lib/format'
import { answersStatus, puzzle, showAnswer } from '../state/answers'
import { backspace, dailyGuesses, dailyStatus, draft, submitDraft, typeLetter } from '../state/daily'
import { href } from '../state/router'

const performance = ['Genius', 'Magnificent', 'Impressive', 'Splendid', 'Great', 'Phew']

/** Today's Wordle: type guesses, colours come from the known answer. */
export function HomePage() {
  const [menuOpen, setMenuOpen] = useState(false)
  const current = puzzle.value
  const guesses = dailyGuesses.value
  const status = dailyStatus.value
  const unavailable = !current

  let banner = null
  if (unavailable) {
    banner =
      answersStatus.value === 'loading' || answersStatus.value === 'idle' ? (
        <p class="notice">Loading today’s puzzle…</p>
      ) : (
        <p class="notice notice-error">
          Couldn’t load today’s word. You can still solve any puzzle in <a href={href('/custom')}>custom mode</a>.
        </p>
      )
  } else if (status === 'won') {
    banner = <p class="notice notice-success"><strong>{performance[guesses.length - 1]}!</strong> Solved in {guesses.length}.</p>
  } else if (status === 'lost') {
    banner = <p class="notice">The answer was <strong class="mono">{current.word}</strong>.</p>
  } else if (showAnswer.value) {
    banner = <p class="notice">Answer: <strong class="mono">{current.word}</strong></p>
  }

  return (
    <>
      <GameScreen
        title="Wordle Helper"
        subtitle={current ? formatPuzzleDate(current.date) : undefined}
        headerEnd={
          <button class="icon-btn" onClick={() => setMenuOpen(true)} aria-label="Menu">
            <MenuIcon />
          </button>
        }
        banner={banner}
        guesses={guesses}
        draft={draft.value}
        locked={unavailable || status !== 'playing'}
        answer={current?.word}
        onLetter={typeLetter}
        onEnter={submitDraft}
        onBackspace={backspace}
      />
      <MenuDialog open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  )
}
