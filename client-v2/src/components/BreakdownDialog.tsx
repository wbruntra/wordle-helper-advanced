import { useEffect, useMemo, useState } from 'preact/hooks'
import { api } from '../api/client'
import { binsForGuess } from '../lib/analysis'
import { applyGuesses, evaluate, type Guess, LIKELY_WORDS as WORDS } from '@wordle/shared'
import { GuessTiles } from './GuessTiles'
import { Modal } from './ui/Modal'
import './BreakdownDialog.css'

interface BreakdownDialogProps {
  open: boolean
  onClose: () => void
  /** Every guess in the game, in order. */
  guesses: Guess[]
  /** Which guess to break down. */
  index: number
  /** The known answer, used to show what the best guess would have scored. */
  answer?: string | null
}

interface BestGuess {
  word: string
  reason: string | null
}

const BEST_GUESS_LIMIT = 2000
const MAX_API_GUESS_NUMBER = 6 // the server only solves up to guess 6

/** Shows how a guess split the remaining words into colour patterns, optionally next to the best alternative. */
export function BreakdownDialog({ open, onClose, guesses, index, answer }: BreakdownDialogProps) {
  const guess = guesses[index]
  const [view, setView] = useState<'played' | 'best'>('played')
  const [best, setBest] = useState<BestGuess | null>(null)

  const before = useMemo(
    () => (guess ? applyGuesses(WORDS, guesses.slice(0, index)) : []),
    [guesses, index, guess],
  )

  useEffect(() => {
    setView('played')
    setBest(null)
    if (!open || !guess || before.length > BEST_GUESS_LIMIT || index + 1 > MAX_API_GUESS_NUMBER)
      return
    let cancelled = false
    api
      .bestGuess(guesses.slice(0, index))
      .then((result) => {
        if (!cancelled) setBest({ word: result.bestGuess, reason: result.reason ?? null })
      })
      .catch((error) => console.error('Failed to fetch best guess', error))
    return () => {
      cancelled = true
    }
  }, [open, index, guesses, before.length, guess])

  if (!guess) return null

  const shown = view === 'best' && best ? best.word : guess.word
  const shownKey =
    view === 'best' && best ? (answer ? evaluate(best.word, answer) : null) : guess.key
  const bins = binsForGuess(shown, before)
  const total = before.length
  const share = (count: number) =>
    `${((count / total) * 100).toFixed(count / total < 0.1 ? 1 : 0)}%`
  const uniqueAnswers = bins.filter((bin) => bin.words.length === 1).length
  const smallWords = (limit: number) =>
    bins.filter((b) => b.words.length <= limit).reduce((sum, b) => sum + b.words.length, 0)

  return (
    <Modal open={open} onClose={onClose} title={`Guess ${index + 1} breakdown`} wide>
      {best && (
        <div class="segmented" role="tablist">
          <button role="tab" aria-selected={view === 'played'} onClick={() => setView('played')}>
            Yours: {guess.word}
          </button>
          <button role="tab" aria-selected={view === 'best'} onClick={() => setView('best')}>
            Best: {best.word}
          </button>
        </div>
      )}

      <div class="breakdown-head">
        <GuessTiles word={shown} keyString={shownKey ?? '-----'} size={40} />
        <p class="muted">
          {shownKey === null ? 'Colours depend on the answer.' : null} {total.toLocaleString()}{' '}
          possible words → {bins.length} possible patterns
        </p>
      </div>

      <dl class="breakdown-stats">
        <div>
          <dt>Unique answer</dt>
          <dd>{share(uniqueAnswers)}</dd>
        </div>
        <div>
          <dt>Down to ≤ 5</dt>
          <dd>{share(smallWords(5))}</dd>
        </div>
        <div>
          <dt>Down to ≤ 20</dt>
          <dd>{share(smallWords(20))}</dd>
        </div>
      </dl>
      {view === 'best' && best?.reason && <p class="field-hint">{best.reason}</p>}

      <ul class="bin-list">
        {bins.map(({ key, words }) => {
          const actual = key === shownKey
          return (
            <li key={key} class={`bin${actual ? ' bin-actual' : ''}`}>
              <div class="bin-top">
                <GuessTiles keyString={key} size={22} />
                {actual && <span class="chip">Actual</span>}
                <span class="bin-count">
                  {words.length.toLocaleString()}{' '}
                  <span class="muted">({share(words.length)})</span>
                </span>
              </div>
              {words.length <= 24 ? (
                <p class="bin-words mono">{words.join(' ')}</p>
              ) : (
                <p class="bin-words muted">Too many to list</p>
              )}
            </li>
          )
        })}
      </ul>
    </Modal>
  )
}
