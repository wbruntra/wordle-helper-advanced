import { memo, useEffect, useMemo, useState } from 'react'
import { Modal, Form } from 'react-bootstrap'

import { orderEntireWordList } from './utils'

function RemainingWordsModal({ show, onHide, remainingWords, startingList }) {
  const DISPLAY_LIMIT = 50
  const [scoredRemainingWords, setScoredRemainingWords] = useState([])
  const [useFullWordlist, setUseFullWordlist] = useState(false)

  const remainingSet = useMemo(() => new Set(remainingWords), [remainingWords])

  const remainingWordSolveChance = useMemo(() => {
    if (remainingWords.length <= 0 || remainingWords.length >= startingList.length) {
      return null
    }

    if (remainingWords.length === 1) {
      return '100% — you have it!'
    }

    return `${(100 / remainingWords.length).toFixed(1)}% chance next guess wins`
  }, [remainingWords, startingList.length])

  useEffect(() => {
    if (!show) {
      return
    }

    if (remainingWords.length === 0 || remainingWords.length >= 1500) {
      setScoredRemainingWords(remainingWords.map((word) => ({ word })))
      return
    }

    const timeoutId = setTimeout(() => {
      const scored = orderEntireWordList(remainingWords, {
        only_filtered: !useFullWordlist,
        startingList,
      })

      setScoredRemainingWords(
        scored.length > 0 ? scored : remainingWords.map((word) => ({ word })),
      )
    }, 0)

    return () => clearTimeout(timeoutId)
  }, [show, remainingWords, startingList, useFullWordlist])

  if (!show) {
    return null
  }

  const displayedScoredWords = scoredRemainingWords.slice(0, DISPLAY_LIMIT)
  const displayedRemainingWords = remainingWords.slice(0, DISPLAY_LIMIT)

  return (
    <Modal show onHide={onHide} size="sm" scrollable>
      <Modal.Header closeButton>
        <Modal.Title>
          {remainingWords.length.toLocaleString()} remaining word
          {remainingWords.length === 1 ? '' : 's'}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {remainingWords.length > 0 && remainingWords.length < 1500 && (
          <Form.Group className="mb-3">
            <Form.Check
              type="checkbox"
              id="use-full-wordlist-check"
              label="Use full wordlist for best guesses"
              checked={useFullWordlist}
              onChange={(e) => setUseFullWordlist(e.target.checked)}
              className="text-white-50"
              style={{ fontSize: '0.85rem' }}
            />
          </Form.Group>
        )}
        {remainingWordSolveChance && (
          <p className="wordle-modal-solve-pct mb-3">{remainingWordSolveChance}</p>
        )}
        {remainingWords.length > DISPLAY_LIMIT && (
          <p className="wordle-modal-solve-pct mb-3">Showing top {DISPLAY_LIMIT}</p>
        )}
        {scoredRemainingWords.length > 0 && scoredRemainingWords[0].score != null ? (
          <table className="remaining-words-table">
            <thead>
              <tr>
                <th>Word</th>
                <th>Solve chance</th>
              </tr>
            </thead>
            <tbody>
              {displayedScoredWords.map(({ word, score }) => {
                const isPossible = remainingSet.has(word)
                return (
                  <tr key={word}>
                    <td>
                      <code>{word}</code>
                      {!isPossible && (
                        <span className="ms-2 badge bg-secondary text-white font-size-xs" style={{ fontSize: '0.65rem' }}>
                          Helper
                        </span>
                      )}
                    </td>
                    <td>{((100 * score) / remainingWords.length).toFixed(1)}%</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        ) : (
          <div className="remaining-words-grid">
            {displayedRemainingWords.map((word) => (
              <code key={word} className="remaining-word-chip">
                {word}
              </code>
            ))}
          </div>
        )}
      </Modal.Body>
    </Modal>
  )
}

export default memo(RemainingWordsModal)
