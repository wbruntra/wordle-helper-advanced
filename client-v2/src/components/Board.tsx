import { MAX_GUESSES } from '../state/daily'
import { WORD_LENGTH, type Guess } from '@wordle/shared'
import './Board.css'

const stateOf = (mark: string | undefined) =>
  mark === 'G' ? 'correct' : mark === 'Y' ? 'present' : 'absent'

interface BoardProps {
  guesses: Guess[]
  /** Letters typed for the row in progress. */
  draft: string
  /** Colours for the draft tiles (custom mode). Tiles become tappable when `onTileClick` is set. */
  draftKey?: string
  onTileClick?: (index: number) => void
  onRowClick?: (index: number) => void
  /** Index of a row to play the reveal animation on. */
  animateRow?: number | null
  /** Hide the draft row (puzzle finished). */
  hideDraft?: boolean
}

export function Board({
  guesses,
  draft,
  draftKey,
  onTileClick,
  onRowClick,
  animateRow,
  hideDraft,
}: BoardProps) {
  const rows = Array.from({ length: MAX_GUESSES }, (_unused, index) => index)

  return (
    <div class="board" role="grid" aria-label="Guesses" onMouseDown={(e) => e.preventDefault()}>
      {rows.map((row) => {
        const guess = guesses[row]
        if (guess) {
          const tiles = [...guess.word].map((letter, i) => (
            <div
              key={i}
              class={`tile tile-${stateOf(guess.key[i])}${animateRow === row ? ' tile-flip' : ''}`}
              role="gridcell"
            >
              {letter}
            </div>
          ))
          return onRowClick ? (
            <button
              key={row}
              class="board-row board-row-button"
              onClick={() => onRowClick(row)}
              aria-label={`Guess ${row + 1}: ${guess.word}. Show breakdown`}
            >
              {tiles}
            </button>
          ) : (
            <div key={row} class="board-row" role="row">
              {tiles}
            </div>
          )
        }

        const isDraftRow = row === guesses.length && !hideDraft
        return (
          <div key={row} class="board-row" role="row">
            {Array.from({ length: WORD_LENGTH }, (_unused, i) => {
              const letter = isDraftRow ? draft[i] : undefined
              const colored = letter && draftKey && draftKey[i] !== undefined
              const state = colored ? stateOf(draftKey[i]) : letter ? 'filled' : 'empty'
              const interactive = Boolean(letter && onTileClick)
              const className = `tile tile-${state}${letter ? ' tile-pop' : ''}${interactive ? ' tile-tappable' : ''}`
              return interactive ? (
                <button
                  key={i}
                  class={className}
                  onClick={() => onTileClick?.(i)}
                  aria-label={`${letter}, tap to change colour`}
                >
                  {letter}
                </button>
              ) : (
                <div key={i} class={className} role="gridcell">
                  {letter}
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}
