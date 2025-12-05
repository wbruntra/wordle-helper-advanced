import React from 'react'

export default function InteractiveGuessInput({ word, currentKey, onKeyChange }) {
  // Ensure we have a valid key string of length 5, padded with '-'
  const safeKey = (currentKey || '').padEnd(5, '-').slice(0, 5)

  // Ensure we have a word string of length 5, padded with spaces for display
  const displayWord = (word || '').padEnd(5, ' ').slice(0, 5)

  const handleBoxClick = (index) => {
    const currentChar = safeKey[index]
    let nextChar = '-'

    if (currentChar === '-' || currentChar === 'B')
      nextChar = 'Y' // B for Black/Blank, though usually '-'
    else if (currentChar === 'Y') nextChar = 'G'
    else if (currentChar === 'G') nextChar = '-'

    const newKeyArray = safeKey.split('')
    newKeyArray[index] = nextChar
    onKeyChange(newKeyArray.join(''))
  }

  const getBackgroundColor = (char) => {
    if (char === 'G') return '#28a745' // Green
    if (char === 'Y') return '#ffc107' // Yellow
    return '#343a40' // Dark Gray/Black for miss/default
  }

  const getBorderColor = (char) => {
    if (char === 'G' || char === 'Y') return 'transparent'
    return '#6c757d' // Gray border for empty/miss
  }

  return (
    <div className="d-flex justify-content-center gap-2 mb-3">
      {displayWord.split('').map((letter, index) => {
        const keyChar = safeKey[index]
        return (
          <div
            key={index}
            onClick={() => handleBoxClick(index)}
            style={{
              width: '50px',
              height: '50px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem',
              fontWeight: 'bold',
              color: 'white',
              backgroundColor: getBackgroundColor(keyChar),
              border: `2px solid ${getBorderColor(keyChar)}`,
              borderRadius: '4px',
              cursor: 'pointer',
              userSelect: 'none',
              transition: 'background-color 0.2s',
            }}
          >
            {letter !== ' ' ? letter : ''}
          </div>
        )
      })}
    </div>
  )
}
