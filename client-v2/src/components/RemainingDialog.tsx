import { useMemo, useState } from 'preact/hooks'
import { useJob } from '../hooks/useAsyncResource'
import { rankInWorker } from '../lib/compute'
import type { Ranking } from '../lib/ranking'
import { applyGuesses, filterByGuess, type Guess, LIKELY_WORDS as WORDS } from '@wordle/shared'
import { GuessTiles } from './GuessTiles'
import { Modal } from './ui/Modal'
import './RemainingDialog.css'

const RANK_LIMIT = 3000
const SHOW_LIMIT = 60
const ELIMINATED_SHOW_LIMIT = 120

interface RemainingDialogProps {
  open: boolean
  onClose: () => void
  guesses: Guess[]
}

type Tab = 'remaining' | 'eliminated'

export function RemainingDialog({ open, onClose, guesses }: RemainingDialogProps) {
  const [tab, setTab] = useState<Tab>('remaining')
  const remaining = useMemo(() => (open ? applyGuesses(WORDS, guesses) : []), [open, guesses])

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`${remaining.length.toLocaleString()} word${remaining.length === 1 ? '' : 's'} left`}
    >
      <div class="segmented" role="tablist">
        <button role="tab" aria-selected={tab === 'remaining'} onClick={() => setTab('remaining')}>
          Remaining
        </button>
        <button
          role="tab"
          aria-selected={tab === 'eliminated'}
          onClick={() => setTab('eliminated')}
        >
          Eliminated
        </button>
      </div>
      {tab === 'remaining' ? (
        <RemainingTab remaining={remaining} guessCount={guesses.length} />
      ) : (
        <EliminatedTab guesses={guesses} />
      )}
    </Modal>
  )
}

function RemainingTab({ remaining, guessCount }: { remaining: string[]; guessCount: number }) {
  const [anyWord, setAnyWord] = useState(false)
  const canRank = guessCount > 0 && remaining.length > 1 && remaining.length < RANK_LIMIT
  const remainingSet = useMemo(() => new Set(remaining), [remaining])

  const ranked = useJob<Ranking>(
    (resolve, reject) => rankInWorker(remaining, WORDS, anyWord, SHOW_LIMIT, resolve, reject),
    [remaining, anyWord],
    canRank,
  )

  const chance =
    remaining.length === 1
      ? 'Only one word left — that’s your answer.'
      : guessCount > 0 && remaining.length > 1
        ? `A random pick wins ${(100 / remaining.length).toFixed(1)}% of the time.`
        : null

  return (
    <>
      {chance && <p class="muted tab-lede">{chance}</p>}

      {canRank && (
        <label class="switch">
          <span>Suggest any word, not just possible answers</span>
          <input
            type="checkbox"
            checked={anyWord}
            onChange={(e) => setAnyWord(e.currentTarget.checked)}
          />
        </label>
      )}

      {canRank && ranked.status === 'loading' && (
        <p class="muted">
          <span class="spinner" /> Ranking guesses…
        </p>
      )}
      {canRank && ranked.status === 'error' && <p class="notice notice-error">{ranked.message}</p>}

      {canRank && ranked.status === 'ready' ? (
        <>
          <p class="field-hint">
            Best guesses first. “Wins within 2” is the chance of finishing by your next guess after
            it.
          </p>
          <table
            class={`rank-table${ranked.stale ? ' rank-table-stale' : ''}`}
            aria-busy={ranked.stale}
          >
            <thead>
              <tr>
                <th>Word</th>
                <th>Wins within 2</th>
              </tr>
            </thead>
            <tbody>
              {ranked.value.top.map(({ word, patterns }) => (
                <tr key={word}>
                  <td>
                    <code>{word}</code>
                    {!remainingSet.has(word) && <span class="chip helper">Helper</span>}
                  </td>
                  <td>{Math.min(100, (100 * patterns) / remaining.length).toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
          {ranked.value.candidates > SHOW_LIMIT && (
            <p class="field-hint">Showing the top {SHOW_LIMIT}.</p>
          )}
        </>
      ) : (
        !canRank && <WordChips words={remaining} limit={SHOW_LIMIT} />
      )}
    </>
  )
}

function EliminatedTab({ guesses }: { guesses: Guess[] }) {
  const steps = useMemo(() => {
    let words = WORDS
    return guesses.map((guess) => {
      const next = filterByGuess(guess, words)
      const kept = new Set(next)
      const removed = words.filter((word) => !kept.has(word))
      words = next
      return { guess, removed }
    })
  }, [guesses])

  if (guesses.length === 0)
    return <p class="muted">Make a guess to see which words it rules out.</p>

  return (
    <div class="eliminated">
      {steps.map(({ guess, removed }, i) => (
        <details key={i} open={i === steps.length - 1}>
          <summary>
            <GuessTiles word={guess.word} keyString={guess.key} size={26} />
            <span class="muted">ruled out {removed.length.toLocaleString()}</span>
          </summary>
          <WordChips words={removed} limit={ELIMINATED_SHOW_LIMIT} />
        </details>
      ))}
    </div>
  )
}

function WordChips({ words, limit }: { words: string[]; limit: number }) {
  return (
    <>
      <div class="word-chips">
        {words.slice(0, limit).map((word) => (
          <code key={word}>{word}</code>
        ))}
      </div>
      {words.length > limit && (
        <p class="field-hint">and {(words.length - limit).toLocaleString()} more</p>
      )}
    </>
  )
}
