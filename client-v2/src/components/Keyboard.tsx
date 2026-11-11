import type { LetterState } from '@wordle/shared'
import './Keyboard.css'

const ROWS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM']

interface KeyboardProps {
  states: Map<string, LetterState>
  onLetter: (letter: string) => void
  onEnter: () => void
  onBackspace: () => void
  disabled?: boolean
  /** Label for the enter key. */
  enterLabel?: string
}

/** On-screen QWERTY keyboard, so phones don't pop up their own. */
export function Keyboard({
  states,
  onLetter,
  onEnter,
  onBackspace,
  disabled,
  enterLabel = 'Enter',
}: KeyboardProps) {
  const stateClass = (letter: string) => {
    const state = states.get(letter)
    return state === 'G'
      ? ' key-correct'
      : state === 'Y'
        ? ' key-present'
        : state === '-'
          ? ' key-absent'
          : ''
  }

  return (
    <div
      class="keyboard"
      role="group"
      aria-label="Keyboard"
      onMouseDown={(e) => e.preventDefault()}
    >
      {ROWS.map((letters, rowIndex) => (
        <div key={rowIndex} class="keyboard-row">
          {rowIndex === 2 && (
            <button class="key key-wide" onClick={onEnter} disabled={disabled}>
              {enterLabel}
            </button>
          )}
          {[...letters].map((letter) => (
            <button
              key={letter}
              class={`key${stateClass(letter)}`}
              onClick={() => onLetter(letter)}
              disabled={disabled}
            >
              {letter}
            </button>
          ))}
          {rowIndex === 2 && (
            <button class="key key-wide" onClick={onBackspace} aria-label="Backspace">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                <path d="M22 3H7c-.69 0-1.23.35-1.59.88L0 12l5.41 8.11c.36.53.9.89 1.59.89h15c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H7.07L2.4 12l4.66-7H22v14zm-11.59-2L14 13.41 17.59 17 19 15.59 15.41 12 19 8.41 17.59 7 14 10.59 10.41 7 9 8.41 12.59 12 9 15.59z" />
              </svg>
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
