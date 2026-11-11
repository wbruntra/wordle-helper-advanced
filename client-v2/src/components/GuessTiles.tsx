import type { Guess } from '@wordle/shared'
import './Board.css'
import './GuessTiles.css'

const stateOf = (mark: string | undefined) =>
  mark === 'G' ? 'correct' : mark === 'Y' ? 'present' : 'absent'

/** A single compact row of coloured tiles for a word and its colour key. */
export function GuessTiles({
  word,
  keyString,
  size = 36,
}: {
  word?: string
  keyString: string
  size?: number
}) {
  const letters = word ?? ''
  return (
    <div
      class="guess-tiles"
      style={{ '--size': `${size}px` }}
      aria-label={word ? `${word} ${keyString}` : keyString}
    >
      {[...keyString].map((mark, i) => (
        <div key={i} class={`tile tile-${stateOf(mark)}`}>
          {letters[i] ?? ''}
        </div>
      ))}
    </div>
  )
}

export const toGuessTiles = (guess: Guess, size?: number) => (
  <GuessTiles word={guess.word} keyString={guess.key} size={size} />
)
