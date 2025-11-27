import React from 'react'

export default function ResponsiveGuess({ guess, word, keyVal, size = 'md' }) {
  // Allow passing either a guess object or separate word/key props
  const guessWord = guess ? guess.word : word
  const guessKey = guess ? guess.key : keyVal

  if (!guessWord) return null

  const getEvaluationColor = (evaluation) => {
    const colors = []
    // Handle case where evaluation might be missing or incomplete
    const evalStr = evaluation || '-----'

    for (let i = 0; i < evalStr.length; i++) {
      const char = evalStr[i]
      if (char === 'G') colors.push('success')
      else if (char === 'Y') colors.push('warning')
      else colors.push('secondary')
    }
    return colors
  }

  const getColorForEvaluation = (colorBadge) => {
    if (colorBadge === 'success') return '#28a745'
    if (colorBadge === 'warning') return '#ffc107'
    if (colorBadge === 'secondary') return '#6c757d'
    return '#6c757d'
  }

  const colors = getEvaluationColor(guessKey)

  // Size configurations
  const sizes = {
    sm: {
      width: 'min(30px, 8vw)',
      height: 'min(30px, 8vw)',
      fontSize: 'calc(0.6rem + 0.8vw)',
    },
    md: {
      width: 'min(40px, 10vw)',
      height: 'min(40px, 10vw)',
      fontSize: 'calc(0.8rem + 1vw)',
    },
    lg: {
      width: 'min(50px, 12vw)',
      height: 'min(50px, 12vw)',
      fontSize: 'calc(1rem + 1.2vw)',
    },
  }

  const currentSize = sizes[size] || sizes.md

  return (
    <div className="d-flex align-items-center gap-2 flex-wrap">
      <div className="d-flex gap-1">
        {guessWord.split('').map((letter, letterIndex) => (
          <div
            key={letterIndex}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: currentSize.width,
              height: currentSize.height,
              fontSize: currentSize.fontSize,
              fontWeight: 'bold',
              color: 'white',
              backgroundColor: getColorForEvaluation(colors[letterIndex]),
              borderRadius: '4px',
            }}
          >
            {letter}
          </div>
        ))}
      </div>
      {guessKey && (
        <code className="ms-2 text-muted" style={{ whiteSpace: 'nowrap' }}>
          {guessKey}
        </code>
      )}
    </div>
  )
}
