import { useState } from 'preact/hooks'
import { GameScreen } from '../components/GameScreen'
import { BackIcon, ImageIcon } from '../components/Icons'
import { ScreenshotDialog } from '../components/ScreenshotDialog'
import { clearCustomGuesses, customGuesses, replaceCustomGuesses } from '../state/custom'
import { customBackspace, customKey, customWord, cycleCustomTile, submitCustomDraft, typeCustomLetter } from '../state/customDraft'
import { MAX_GUESSES } from '../state/daily'
import { href } from '../state/router'

/** Solve any puzzle: enter each guess and tap its tiles to set the colours Wordle gave you. */
export function CustomPage() {
  const [importing, setImporting] = useState(false)
  const guesses = customGuesses.value
  const full = guesses.length >= MAX_GUESSES

  return (
    <>
      <GameScreen
        title="Custom puzzle"
        headerStart={
          <a class="icon-btn" href={href('/')} aria-label="Back to today’s puzzle"><BackIcon /></a>
        }
        headerEnd={
          <>
            <button class="icon-btn" onClick={() => setImporting(true)} aria-label="Import screenshot"><ImageIcon /></button>
            {guesses.length > 0 && <button class="btn" onClick={clearCustomGuesses}>Clear</button>}
          </>
        }
        banner={
          <p class="notice">
            {full ? 'Board full.' : 'Type a word, tap its tiles to set the colours (grey → yellow → green), then press Add.'}
          </p>
        }
        guesses={guesses}
        draft={customWord.value}
        draftKey={customKey.value}
        locked={full}
        enterLabel="Add"
        onLetter={typeCustomLetter}
        onEnter={submitCustomDraft}
        onBackspace={customBackspace}
        onTileClick={cycleCustomTile}
      />
      <ScreenshotDialog open={importing} onClose={() => setImporting(false)} onImport={replaceCustomGuesses} />
    </>
  )
}
