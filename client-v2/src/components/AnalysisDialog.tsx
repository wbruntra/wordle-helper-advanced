import { useEffect, useState } from 'preact/hooks'
import type { BestMoveScope, GuessAnalysis, TurnAnalysis } from '../lib/analysis'
import { analyzeTurnsInWorker } from '../lib/compute'
import { type Guess, LIKELY_WORDS as WORDS } from '@wordle/shared'
import { GuessTiles } from './GuessTiles'
import { Modal } from './ui/Modal'
import './AnalysisDialog.css'

interface AnalysisDialogProps {
  open: boolean
  onClose: () => void
  guesses: Guess[]
}

/** Turn-by-turn review comparing each guess with the best move available at that point. */
export function AnalysisDialog({ open, onClose, guesses }: AnalysisDialogProps) {
  const [turn, setTurn] = useState(0)
  /** Each result remembers the scope it was computed for, so old ones can stay up (dimmed) while new ones arrive. */
  const [turns, setTurns] = useState<
    Record<number, { scope: BestMoveScope; analysis: TurnAnalysis }>
  >({})
  const [scope, setScope] = useState<BestMoveScope>('possible')
  const [error, setError] = useState<string | null>(null)

  // A new game state starts the review over, at the latest turn.
  useEffect(() => {
    if (!open || guesses.length === 0) return
    setTurns({})
    setTurn(guesses.length - 1)
  }, [open, guesses])

  // Streams results in guess order, so earlier turns appear first. Changing the scope
  // recomputes in place without resetting the turn or blanking the cards.
  useEffect(() => {
    if (!open || guesses.length === 0) return
    setError(null)
    return analyzeTurnsInWorker(
      WORDS,
      guesses,
      scope,
      (index, analysis) => setTurns((current) => ({ ...current, [index]: { scope, analysis } })),
      setError,
    )
  }, [open, guesses, scope])

  const guess = guesses[turn]
  const result = turns[turn]
  const analysis = result?.analysis
  const stale = result !== undefined && result.scope !== scope

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="How you did"
      footer={
        <>
          <button
            class="btn"
            style={{ flex: 1 }}
            disabled={turn === 0}
            onClick={() => setTurn(turn - 1)}
          >
            ← Previous
          </button>
          <button
            class="btn"
            style={{ flex: 1 }}
            disabled={turn >= guesses.length - 1}
            onClick={() => setTurn(turn + 1)}
          >
            Next →
          </button>
        </>
      }
    >
      {!guess ? (
        <p class="muted">Make a guess first.</p>
      ) : (
        <>
          <p class="muted analysis-step">
            Guess {turn + 1} of {guesses.length}
          </p>
          <label class="switch">
            <span>Consider words that can’t be the answer</span>
            <input
              type="checkbox"
              checked={scope === 'any'}
              onChange={(e) => setScope(e.currentTarget.checked ? 'any' : 'possible')}
            />
          </label>
          {error && <p class="notice notice-error">{error}</p>}
          {!analysis && !error && (
            <p class="muted">
              <span class="spinner" /> Crunching the numbers…
            </p>
          )}
          {analysis && (
            <div class={stale ? 'analysis-stale' : undefined} aria-busy={stale}>
              <TurnView guess={guess} analysis={analysis} scope={result.scope} />
            </div>
          )}
        </>
      )}
    </Modal>
  )
}

function TurnView({
  guess,
  analysis,
  scope,
}: {
  guess: Guess
  analysis: TurnAnalysis
  scope: BestMoveScope
}) {
  const { played, best } = analysis
  const patternGap = best ? best.analysis.patterns - played.patterns : null
  const guessesGap = analysis.expectedGuesses
    ? analysis.expectedGuesses.played - analysis.expectedGuesses.best
    : null
  const bitsGap = best ? best.analysis.bits - played.bits : null

  return (
    <>
      <p class="analysis-lede">
        {analysis.remainingBefore === 1
          ? 'Only one word was left — you had it.'
          : `${analysis.remainingBefore.toLocaleString()} words were possible.`}
      </p>

      <div class="analysis-cards">
        <Card title="You played" word={guess.word} keyString={guess.key} analysis={played} />
        {best ? (
          <Card
            title={scope === 'any' ? 'Best move (any word)' : 'Best move (possible answers)'}
            word={best.word}
            keyString="-----"
            analysis={best.analysis}
            highlight
          />
        ) : (
          <section class="analysis-card">
            <h3>Best move</h3>
            <p class="muted">{analysis.note}</p>
          </section>
        )}
      </div>

      <section class="verdict">
        <h3>Verdict</h3>
        {patternGap === null ? (
          <p class="muted">Couldn’t compare this turn.</p>
        ) : patternGap > 0 ? (
          <p>
            The best move would have split the words into {patternGap} more pattern
            {patternGap === 1 ? '' : 's'}.
          </p>
        ) : patternGap === 0 ? (
          <p>You played the best move. 🎯</p>
        ) : (
          <p>
            Your guess made {-patternGap} more pattern{patternGap === -1 ? '' : 's'} than the
            suggestion. 🌟
          </p>
        )}
        {bitsGap !== null && bitsGap >= 0.05 && (
          <p class="muted">
            −{bitsGap.toFixed(1)} bits
            {guessesGap !== null && guessesGap >= 0.005 && (
              <> · +{guessesGap.toFixed(2)} guesses</>
            )}{' '}
            vs best
          </p>
        )}
        {analysis.note && best && (
          <p class="muted">
            <em>{analysis.note}</em>
          </p>
        )}
      </section>
    </>
  )
}

function Card({
  title,
  word,
  keyString,
  analysis,
  highlight,
}: {
  title: string
  word: string
  keyString: string
  analysis: GuessAnalysis
  highlight?: boolean
}) {
  return (
    <section class={`analysis-card${highlight ? ' analysis-card-best' : ''}`}>
      <h3>{title}</h3>
      <GuessTiles word={word} keyString={keyString} size={34} />
      <dl>
        <div>
          <dt>Patterns</dt>
          <dd>{analysis.patterns}</dd>
        </div>
        <div>
          <dt>Avg words / pattern</dt>
          <dd>{analysis.avgBinSize.toFixed(2)}</dd>
        </div>
        <div>
          <dt>Largest group</dt>
          <dd>{analysis.maxBinSize}</dd>
        </div>
        <div>
          <dt>Information</dt>
          <dd>{analysis.bits.toFixed(2)} bits</dd>
        </div>
      </dl>
    </section>
  )
}
