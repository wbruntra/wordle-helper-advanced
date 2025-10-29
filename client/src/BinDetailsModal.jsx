import { Modal, Badge } from 'react-bootstrap'

export default function BinDetailsModal({
  show,
  onHide,
  guess,
  evaluation,
  binsData,
  remainingWordsBefore,
  strategy,
}) {
  if (!guess || !binsData) {
    return null
  }

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

  const colors = getEvaluationColor(evaluation)

  return (
    <Modal show={show} onHide={onHide} size="lg" scrollable>
      <Modal.Header closeButton>
        <Modal.Title>
          Bin Details for Guess: {guess}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <>
          <div className="mb-4">
            <h6>Guess Information</h6>
            <div className="d-flex align-items-center gap-2 mb-3">
              <div className="d-flex gap-1">
                {guess.split('').map((letter, letterIndex) => (
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
                      color: 'white',
                      backgroundColor: getColorForEvaluation(colors[letterIndex]),
                      borderRadius: '4px',
                    }}
                  >
                    {letter}
                  </div>
                ))}
              </div>
              <code className="ms-auto">{evaluation}</code>
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
          </div>

          <div>
            <h6>Bin Distribution</h6>
            <p className="text-muted small mb-3">
              Each row shows how many remaining words would produce that color pattern.
            </p>
            <div className="d-flex flex-column gap-2">
              {Object.entries(binsData)
                .sort(([, valA], [, valB]) => {
                  const countA = Array.isArray(valA) ? valA.length : valA
                  const countB = Array.isArray(valB) ? valB.length : valB
                  return countB - countA
                })
                .map(([evaluationPattern, words]) => {
                  const count = Array.isArray(words) ? words.length : words
                  const isActualResult = evaluationPattern === evaluation.replace(/[^GY]/g, '-')

                  return (
                    <div
                      key={evaluationPattern}
                      className={`border rounded p-2 ${isActualResult ? 'border-primary bg-secondary' : ''}`}
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
                            bg={isActualResult ? 'primary' : 'secondary'}
                            className="ms-2"
                          >
                            {count} words
                          </Badge>
                          {isActualResult && (
                            <Badge bg="success" className="ms-1">Your Result</Badge>
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
