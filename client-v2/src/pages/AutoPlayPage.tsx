import { useState } from 'preact/hooks'
import { api } from '../api/client'
import { BreakdownDialog } from '../components/BreakdownDialog'
import { GuessTiles } from '../components/GuessTiles'
import { BackIcon } from '../components/Icons'
import { isValidWord, normalizeWord, type AutoPlayResponse, type Guess } from '@wordle/shared'
import { recentAnswers } from '../state/answers'
import { href } from '../state/router'
import './AutoPlayPage.css'

const verdicts = ['Incredible!', 'Excellent!', 'Very good!', 'Good', 'Okay', 'Close call']

/** Let the solver play a puzzle by itself and explore every move it made. */
export function AutoPlayPage() {
  const [answer, setAnswer] = useState('')
  const [startingWord, setStartingWord] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [playing, setPlaying] = useState(false)
  const [result, setResult] = useState<AutoPlayResponse | null>(null)
  const [openStep, setOpenStep] = useState<number | null>(null)

  const play = async (event: Event) => {
    event.preventDefault()
    const target = normalizeWord(answer)
    const start = normalizeWord(startingWord)
    if (!isValidWord(target)) return setError('The answer must be a 5-letter word.')
    if (start && !isValidWord(start)) return setError('The starting word must be a 5-letter word.')

    setError(null)
    setResult(null)
    setPlaying(true)
    try {
      setResult(await api.autoPlay(target, start || undefined))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Auto-play failed.')
    } finally {
      setPlaying(false)
    }
  }

  const guesses: Guess[] =
    result?.steps.map((step) => ({ word: step.guess, key: step.evaluation })) ?? []

  return (
    <div class="page">
      <header class="page-header">
        <a class="icon-btn" href={href('/')} aria-label="Back">
          <BackIcon />
        </a>
        <h1>Auto-play</h1>
      </header>

      <form class="card" onSubmit={play}>
        <div class="field">
          <label for="auto-answer">Answer</label>
          <input
            id="auto-answer"
            class="mono-input"
            type="text"
            maxLength={5}
            placeholder="CRANE"
            autocomplete="off"
            value={answer}
            disabled={playing}
            onInput={(e) => setAnswer(e.currentTarget.value.toUpperCase())}
          />
        </div>

        {recentAnswers.value.length > 0 && (
          <div class="field">
            <label for="auto-recent">…or pick a recent answer</label>
            <select
              id="auto-recent"
              value=""
              disabled={playing}
              onChange={(e) => e.currentTarget.value && setAnswer(e.currentTarget.value)}
            >
              <option value="">Choose…</option>
              {recentAnswers.value.map((p) => (
                <option key={p.date} value={p.word}>
                  {p.word} ({p.date})
                </option>
              ))}
            </select>
          </div>
        )}

        <div class="field">
          <label for="auto-start">
            Starting word <span class="muted">(optional)</span>
          </label>
          <input
            id="auto-start"
            class="mono-input"
            type="text"
            maxLength={5}
            placeholder="CRATE"
            autocomplete="off"
            value={startingWord}
            disabled={playing}
            onInput={(e) => setStartingWord(e.currentTarget.value.toUpperCase())}
          />
          <span class="field-hint">
            Guess 1 is your starting word, guess 2 comes from the precomputed cache, then the
            solver separates the remaining words.
          </span>
        </div>

        {error && (
          <p class="notice notice-error" style={{ marginBottom: '12px' }}>
            {error}
          </p>
        )}
        <button class="btn btn-primary btn-block" type="submit" disabled={playing}>
          {playing ? (
            <>
              <span class="spinner" /> Playing…
            </>
          ) : (
            'Play'
          )}
        </button>
      </form>

      {result && (
        <section class="card result">
          <div class="result-head">
            <div>
              <h2>{result.solved ? 'Solved' : 'Not solved'}</h2>
              <p class="muted">
                {result.solved
                  ? (verdicts[result.totalGuesses - 1] ?? 'Took a while')
                  : 'Better luck next time.'}
              </p>
            </div>
            <div class="result-count">
              <strong>{result.totalGuesses}</strong>
              <span class="muted">guesses</span>
            </div>
          </div>

          <ol class="steps">
            {result.steps.map((step, i) => (
              <li key={step.guessNumber}>
                <button class="step" onClick={() => setOpenStep(i)}>
                  <GuessTiles word={step.guess} keyString={step.evaluation} size={38} />
                  <span class="step-meta muted">
                    {step.remainingWordsPreGuess.toLocaleString()} →{' '}
                    {step.remainingWordsPostGuess.toLocaleString()} words
                    {step.bins !== undefined && ` · ${step.bins} patterns`}
                  </span>
                  <span class="step-strategy muted">{step.strategy}</span>
                </button>
              </li>
            ))}
          </ol>
          <button
            class="btn btn-block"
            onClick={() => {
              setResult(null)
              setAnswer('')
              setStartingWord('')
            }}
          >
            Try another
          </button>
        </section>
      )}

      <BreakdownDialog
        open={openStep !== null}
        onClose={() => setOpenStep(null)}
        guesses={guesses}
        index={openStep ?? 0}
        answer={normalizeWord(answer)}
      />
    </div>
  )
}
