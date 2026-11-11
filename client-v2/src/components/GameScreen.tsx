import type { ComponentChildren } from 'preact'
import { useEffect, useMemo, useRef, useState } from 'preact/hooks'
import { solvePhase } from '../lib/phase'
import { applyGuesses, type Guess, letterStates, LIKELY_WORDS as WORDS } from '@wordle/shared'
import { AnalysisDialog } from './AnalysisDialog'
import { Board } from './Board'
import { BreakdownDialog } from './BreakdownDialog'
import { ChartIcon } from './Icons'
import { Keyboard } from './Keyboard'
import { RemainingDialog } from './RemainingDialog'
import './GameScreen.css'

interface GameScreenProps {
  title: string
  subtitle?: string
  headerStart?: ComponentChildren
  headerEnd?: ComponentChildren
  banner?: ComponentChildren

  guesses: Guess[]
  draft: string
  draftKey?: string
  /** No more input is accepted (puzzle finished or unavailable). */
  locked?: boolean
  answer?: string | null
  enterLabel?: string

  onLetter: (letter: string) => void
  onEnter: () => void
  onBackspace: () => void
  onTileClick?: (index: number) => void
}

type Dialog = { kind: 'remaining' } | { kind: 'analysis' } | { kind: 'breakdown'; index: number } | null

/**
 * The shared play surface: header, board, keyboard and the solver tools (words left,
 * eliminated words, breakdowns, analysis). Pages supply the guesses and input handlers.
 */
export function GameScreen(props: GameScreenProps) {
  const { guesses, draft, locked, answer, onLetter, onEnter, onBackspace } = props
  const [dialog, setDialog] = useState<Dialog>(null)

  const remaining = useMemo(() => applyGuesses(WORDS, guesses), [guesses])
  const states = useMemo(() => letterStates(guesses), [guesses])

  // Flip the newest row only when a guess was just added, not when a saved game loads.
  const previousCount = useRef(guesses.length)
  const [animateRow, setAnimateRow] = useState<number | null>(null)
  useEffect(() => {
    setAnimateRow(guesses.length === previousCount.current + 1 ? guesses.length - 1 : null)
    previousCount.current = guesses.length
  }, [guesses.length])

  // Physical keyboard support, paused while a dialog or form control has focus.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || document.querySelector('dialog[open]')) return
      if (event.target instanceof HTMLElement && event.target.closest('input, select, textarea')) return
      if (event.key === 'Enter') {
        // Let a focused button handle its own Enter press.
        if (event.target instanceof HTMLButtonElement) return
        onEnter()
      } else if (event.key === 'Backspace') onBackspace()
      else if (/^[a-zA-Z]$/.test(event.key)) onLetter(event.key.toUpperCase())
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onLetter, onEnter, onBackspace])

  const close = () => setDialog(null)
  const phase = solvePhase(remaining.length)
  const lastBreakdown = dialog?.kind === 'breakdown' ? dialog.index : 0

  return (
    <div class="screen">
      <header class="screen-header">
        <div class="screen-header-side">{props.headerStart}</div>
        <div class="screen-title">
          <h1>{props.title}</h1>
          {props.subtitle && <p class="muted">{props.subtitle}</p>}
        </div>
        <div class="screen-header-side screen-header-end">
          {guesses.length > 0 && (
            <button class="icon-btn" onClick={() => setDialog({ kind: 'analysis' })} aria-label="How you did">
              <ChartIcon />
            </button>
          )}
          {props.headerEnd}
        </div>
      </header>

      <main class="screen-main">
        {props.banner}

        <Board
          guesses={guesses}
          draft={draft}
          draftKey={props.draftKey}
          animateRow={animateRow}
          hideDraft={locked}
          onTileClick={locked ? undefined : props.onTileClick}
          onRowClick={(index) => setDialog({ kind: 'breakdown', index })}
        />

        <button class="words-left" onClick={() => setDialog({ kind: 'remaining' })}>
          <strong>{remaining.length.toLocaleString()}</strong> {remaining.length === 1 ? 'word' : 'words'} left
          <span class="chip">{phase}</span>
        </button>
        {guesses.length > 0 && remaining.length === 0 && (
          <p class="notice notice-error">No words match these guesses — check the colours.</p>
        )}
      </main>

      <footer class="screen-footer">
        <Keyboard
          states={states}
          onLetter={onLetter}
          onEnter={onEnter}
          onBackspace={onBackspace}
          disabled={locked}
          enterLabel={props.enterLabel}
        />
      </footer>

      <RemainingDialog open={dialog?.kind === 'remaining'} onClose={close} guesses={guesses} />
      <AnalysisDialog open={dialog?.kind === 'analysis'} onClose={close} guesses={guesses} />
      <BreakdownDialog open={dialog?.kind === 'breakdown'} onClose={close} guesses={guesses} index={lastBreakdown} answer={answer} />
    </div>
  )
}
