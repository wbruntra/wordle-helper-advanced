import { Modal, Badge, Button, ButtonGroup } from 'react-bootstrap'
import { useState } from 'react'

export default function BinDetailsModal({
  show,
  onHide,
  guess,
  evaluation,
  binsData,
  remainingWordsBefore,
  strategy,
  // Optional: Best/alternative guess data
  bestGuess,
  bestEvaluation,
  bestBinsData,
  bestGuessInfo, // Can include score, reason, etc.
}) {
  const [viewMode, setViewMode] = useState('actual') // 'actual' or 'best'
  
  if (!guess || !binsData) {
    return null
  }
  
  // Determine which data to display based on viewMode
  const displayGuess = viewMode === 'best' && bestGuess ? bestGuess : guess
  const displayEvaluation = viewMode === 'best' && bestEvaluation ? bestEvaluation : evaluation
  const displayBinsData = viewMode === 'best' && bestBinsData ? bestBinsData : binsData
  
  const hasBestGuess = bestGuess && bestBinsData
  const showEvaluationColors = viewMode === 'actual' || (viewMode === 'best' && bestEvaluation)

  const getEvaluationColor = (evaluation) => {
    const colors = []
    for (let i = 0; i < evaluation.length; i++) {
      const char = evaluation[i]
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

  const colors = displayEvaluation ? getEvaluationColor(displayEvaluation) : []

  return (
    <Modal show={show} onHide={onHide} size="lg" scrollable>
      <Modal.Header closeButton>
        <Modal.Title>
          Bin Details for Guess: {displayGuess}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <>
          {hasBestGuess && (
            <div className="mb-3">
              <ButtonGroup className="w-100">
                <Button
                  variant={viewMode === 'actual' ? 'primary' : 'outline-primary'}
                  onClick={() => setViewMode('actual')}
                >
                  Your Guess: {guess}
                </Button>
                <Button
                  variant={viewMode === 'best' ? 'success' : 'outline-success'}
                  onClick={() => setViewMode('best')}
                >
                  Best Guess: {bestGuess}
                </Button>
              </ButtonGroup>
              {viewMode === 'best' && bestGuessInfo?.reason && (
                <div className="mt-2 text-muted small">
                  <strong>Why this is optimal:</strong> {bestGuessInfo.reason}
                </div>
              )}
            </div>
          )}
          
          <div className="mb-4">
            <h6>Guess Information</h6>
            <div className="d-flex align-items-center gap-2 mb-3">
              <div className="d-flex gap-1">
                {displayGuess.split('').map((letter, letterIndex) => (
                  <div
                    key={letterIndex}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '35px',
                      height: '35px',
                      fontSize: '1rem',
                      fontWeight: 'bold',
                      color: showEvaluationColors ? 'white' : '#6c757d',
                      backgroundColor: showEvaluationColors ? getColorForEvaluation(colors[letterIndex]) : 'transparent',
                      border: showEvaluationColors ? 'none' : '2px solid #6c757d',
                      borderRadius: '4px',
                    }}
                  >
                    {letter}
                  </div>
                ))}
              </div>
              {showEvaluationColors && <code className="ms-auto">{displayEvaluation}</code>}
              {!showEvaluationColors && (
                <small className="ms-auto text-muted">(Evaluation unknown)</small>
              )}
            </div>
            {strategy && (
              <div className="text-muted small">
                <div><strong>Strategy:</strong> {strategy}</div>
              </div>
            )}
            {remainingWordsBefore && (
              <div className="text-muted small mt-2">
                <strong>Words before this guess:</strong> {remainingWordsBefore}
              </div>
            )}
            {viewMode === 'best' && bestGuessInfo && (
              <div className="text-muted small mt-2">
                {bestGuessInfo.binsCount && (
                  <div><strong>Bins created:</strong> {bestGuessInfo.binsCount}</div>
                )}
                {bestGuessInfo.avgBinSize && (
                  <div><strong>Average bin size:</strong> {bestGuessInfo.avgBinSize.toFixed(2)}</div>
                )}
                {bestGuessInfo.distributionScore && (
                  <div><strong>Distribution score:</strong> {bestGuessInfo.distributionScore.toFixed(2)}</div>
                )}
              </div>
            )}
          </div>

          <div>
            <h6>Bin Distribution</h6>
            <p className="text-muted small mb-3">
              Each row shows how many remaining words would produce that color pattern.
            </p>
            <div className="d-flex flex-column gap-2">
              {Object.entries(displayBinsData)
                .sort(([, valA], [, valB]) => {
                  const countA = Array.isArray(valA) ? valA.length : valA
                  const countB = Array.isArray(valB) ? valB.length : valB
                  return countB - countA
                })
                .map(([evaluationPattern, words]) => {
                  const count = Array.isArray(words) ? words.length : words
                  const isActualResult = viewMode === 'actual' && evaluationPattern === evaluation.replace(/[^GY]/g, '-')
                  const isBestResult = viewMode === 'best' && bestEvaluation && evaluationPattern === bestEvaluation.replace(/[^GY]/g, '-')
                  const isHighlighted = isActualResult || isBestResult

                  return (
                    <div
                      key={evaluationPattern}
                      className={`border rounded p-2 ${isHighlighted ? 'border-primary bg-secondary' : ''}`}
                    >
                      <div className="d-flex align-items-center justify-content-between">
                        <div className="d-flex align-items-center gap-2">
                          <div className="d-flex gap-1">
                            {evaluationPattern.split('').map((char, index) => (
                              <div
                                key={index}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  width: '25px',
                                  height: '25px',
                                  fontSize: '0.8rem',
                                  fontWeight: 'bold',
                                  color: 'white',
                                  backgroundColor: getColorForEvaluation(
                                    char === 'G' ? 'success' : char === 'Y' ? 'warning' : 'secondary'
                                  ),
                                  borderRadius: '3px',
                                }}
                              >
                                {char}
                              </div>
                            ))}
                          </div>
                          <Badge
                            bg={isHighlighted ? 'primary' : 'secondary'}
                            className="ms-2"
                          >
                            {count} words
                          </Badge>
                          {isActualResult && (
                            <Badge bg="success" className="ms-1">Your Result</Badge>
                          )}
                          {isBestResult && (
                            <Badge bg="success" className="ms-1">Expected Result</Badge>
                          )}
                        </div>
                        <small className="text-muted">
                          {count > 0 && `${((count / remainingWordsBefore) * 100).toFixed(1)}%`}
                        </small>
                      </div>

                      {Array.isArray(words) && words.length > 0 && words.length <= 20 && (
                        <div className="mt-2">
                          <small className="text-muted">Words: </small>
                          <small className="font-monospace">
                            {words.join(', ')}
                          </small>
                        </div>
                      )}

                      {Array.isArray(words) && words.length > 20 && (
                        <div className="mt-2">
                          <small className="text-muted">First 20 words: </small>
                          <small className="font-monospace">
                            {words.slice(0, 20).join(', ')}...
                          </small>
                        </div>
                      )}
                    </div>
                  )
                })}
            </div>
          </div>
        </>
      </Modal.Body>
    </Modal>
  )
}
