import { useState, useEffect } from 'react'
import { Container, Form, Button, Alert, Spinner, Card, Badge, Row, Col, Modal } from 'react-bootstrap'
import { useNavigate } from 'react-router-dom'
import { FiArrowLeft } from 'react-icons/fi'
import { trpc } from './trpc'
import { getBins, applyGuesses } from './advancedUtils'
import wordList from './wordlists/likely-word-list.json'

export default function AutoPlayPage() {
  const navigate = useNavigate()
  const [answer, setAnswer] = useState('')
  const [startingWord, setStartingWord] = useState('')
  const [error, setError] = useState('')
  const [gameResult, setGameResult] = useState(null)
  const [selectedGuess, setSelectedGuess] = useState(null)
  const [showBinModal, setShowBinModal] = useState(false)
  const [binsData, setBinsData] = useState(null)
  const [recentAnswers, setRecentAnswers] = useState([])

  // Use tRPC mutation hook
  const autoPlayMutation = trpc.autoPlay.useMutation({
    onSuccess: (data) => {
      if (data.error) {
        setError(data.error)
      } else {
        setGameResult(data)
      }
    },
    onError: (err) => {
      setError(err.message || 'Failed to auto-play Wordle')
      console.error('Error:', err)
    },
  })

  // Fetch recent answers on component mount using tRPC useQuery hook
  const recentAnswersQuery = trpc.getRecentAnswers.useQuery({ limit: 10 })

  // Update recentAnswers state when query data changes
  useEffect(() => {
    if (recentAnswersQuery.data && recentAnswersQuery.data.answers) {
      console.log('Setting recent answers from query:', recentAnswersQuery.data.answers)
      setRecentAnswers(recentAnswersQuery.data.answers)
    }
  }, [recentAnswersQuery.data])

  const loadingAnswersQuery = recentAnswersQuery.isLoading

  const handleAutoPlay = (e) => {
    e.preventDefault()
    setError('')
    setGameResult(null)

    // Validate answer
    if (!answer || answer.length !== 5) {
      setError('Answer must be a 5-letter word')
      return
    }

    if (!/^[A-Za-z]+$/.test(answer)) {
      setError('Answer must contain only letters')
      return
    }

    // Validate starting word if provided
    if (startingWord) {
      if (startingWord.length !== 5) {
        setError('Starting word must be a 5-letter word')
        return
      }
      if (!/^[A-Za-z]+$/.test(startingWord)) {
        setError('Starting word must contain only letters')
        return
      }
    }

    // Call the mutation
    autoPlayMutation.mutate({
      answer: answer.toUpperCase(),
      startingWord: startingWord ? startingWord.toUpperCase() : undefined,
    })
  }

  const getPerformanceMessage = (guesses) => {
    if (guesses === 1) return '🌟 INCREDIBLE!'
    if (guesses === 2) return '🎯 EXCELLENT!'
    if (guesses === 3) return '👍 VERY GOOD!'
    if (guesses === 4) return '✅ GOOD!'
    if (guesses === 5) return '⚠️ OKAY'
    if (guesses === 6) return '😅 CLOSE CALL'
    return '🤔 TOOK A WHILE'
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

  const handleGuessClick = (step, allSteps) => {
    // Get all previous guesses (excluding current one)
    const previousGuesses = allSteps
      .filter(s => s.guessNumber < step.guessNumber)
      .map(s => ({
        word: s.guess,
        key: s.evaluation
      }))

    // Apply previous guesses to get the remaining words before this guess
    let remainingWords = wordList
    if (previousGuesses.length > 0) {
      remainingWords = applyGuesses(wordList, previousGuesses)
    }

    // Calculate bins for this guess
    const bins = getBins(step.guess, remainingWords, {
      returnObject: true,
      showMatches: true
    })

    setSelectedGuess(step)
    setBinsData(bins)
    setShowBinModal(true)
  }

  return (
    <Container className="mt-4 mb-4">
      <div className="d-flex align-items-center mb-4">
        <Button
          variant="outline-secondary"
          size="sm"
          onClick={() => navigate('/')}
          className="me-3"
        >
          <FiArrowLeft size={18} /> Back
        </Button>
        <h1 className="m-0">Auto-Play Wordle</h1>
      </div>

      <Row className="mb-4">
        <Col lg={6}>
          <Card className="mb-4">
            <Card.Body>
              <Card.Title>Play Automatically</Card.Title>
              <Form onSubmit={handleAutoPlay}>
                <Form.Group className="mb-3">
                  <Form.Label>Answer *</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Enter the target word"
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value.toUpperCase())}
                    maxLength="5"
                    className="text-uppercase"
                    disabled={autoPlayMutation.isPending}
                  />
                  <Form.Text className="text-muted">
                    The word you want to solve
                  </Form.Text>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Or Select Recent Answer</Form.Label>
                  {loadingAnswersQuery ? (
                    <div className="d-flex align-items-center gap-2">
                      <Spinner animation="border" size="sm" />
                      <span className="text-muted">Loading recent answers...</span>
                    </div>
                  ) : recentAnswers.length > 0 ? (
                    <Form.Select
                      onChange={(e) => {
                        if (e.target.value) {
                          setAnswer(e.target.value)
                        }
                      }}
                      disabled={autoPlayMutation.isPending}
                      defaultValue=""
                    >
                      <option value="">-- Select an answer from recent history --</option>
                      {recentAnswers.map((item) => (
                        <option key={item.date} value={item.word}>
                          {item.word} ({item.date})
                        </option>
                      ))}
                    </Form.Select>
                  ) : (
                    <Form.Text className="text-muted">
                      No recent answers available
                    </Form.Text>
                  )}
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Starting Word (Optional)</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Default: CRATE"
                    value={startingWord}
                    onChange={(e) => setStartingWord(e.target.value.toUpperCase())}
                    maxLength="5"
                    className="text-uppercase"
                    disabled={autoPlayMutation.isPending}
                  />
                  <Form.Text className="text-muted">
                    Leave blank to use the default (CRATE)
                  </Form.Text>
                </Form.Group>

                {error && <Alert variant="danger">{error}</Alert>}

                <Button
                  variant="primary"
                  type="submit"
                  disabled={autoPlayMutation.isPending}
                  className="w-100"
                >
                  {autoPlayMutation.isPending ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-2" />
                      Playing...
                    </>
                  ) : (
                    '🎮 Auto-Play'
                  )}
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={6}>
          <Card className="bg-secondary">
            <Card.Body>
              <Card.Title>How it works</Card.Title>
              <ul className="mb-0">
                <li><strong>Guess 1:</strong> Your specified starting word (default: CRATE)</li>
                <li><strong>Guess 2:</strong> Uses pre-computed database cache for optimal choice</li>
                <li><strong>Guess 3+:</strong> Uses intelligent word separation strategy</li>
              </ul>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {gameResult && (
        <Card className={`${gameResult.solved ? 'border-success' : 'border-danger'} mb-4`}>
          <Card.Body>
            <div className="d-flex justify-content-between align-items-center mb-4">
              <div>
                <h3 className="mb-0">
                  {gameResult.solved ? '✅ SOLVED' : '❌ FAILED'}
                </h3>
                <p className="text-muted mb-0">
                  {gameResult.solved ? getPerformanceMessage(gameResult.totalGuesses) : 'Better luck next time!'}
                </p>
              </div>
              <div className="text-center">
                <div style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>
                  {gameResult.totalGuesses}
                </div>
                <small className="text-muted">guesses</small>
              </div>
            </div>

            <div className="mb-4">
              <h5>Guess History</h5>
              <div className="d-flex flex-column gap-3">
                {gameResult.steps.map((step, index) => {
                  const colors = getEvaluationColor(step.evaluation)

                  return (
                    <div
                      key={index}
                      className="border rounded p-3 clickable-card"
                      style={{ cursor: 'pointer', transition: 'background-color 0.2s' }}
                      onClick={() => handleGuessClick(step, gameResult.steps)}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#3a3f47')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '')}
                    >
                      <div className="d-flex align-items-center gap-2 mb-2">
                        <Badge bg="secondary" className="me-2">
                          #{step.guessNumber}
                        </Badge>
                        <div className="d-flex gap-1">
                          {step.guess.split('').map((letter, letterIndex) => (
                            <div
                              key={letterIndex}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '40px',
                                height: '40px',
                                fontSize: '1.2rem',
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
                        <code className="ms-auto text-muted">{step.evaluation}</code>
                      </div>

                      <div className="text-muted small">
                        <div className="mb-2">
                          <strong>Strategy:</strong> {step.strategy}
                        </div>
                        <div className="d-flex gap-3 flex-wrap">
                          <div>
                            📊 <strong>Before:</strong> {step.remainingWordsPreGuess} words
                          </div>
                          <div>
                            ✂️ <strong>After:</strong> {step.remainingWordsPostGuess} words
                          </div>
                          {step.bins !== undefined && (
                            <div>
                              📦 <strong>Bins:</strong> {step.bins}
                            </div>
                          )}
                        </div>
                        <div className="mt-2 text-primary">
                          <small>🔍 Click to see bin details</small>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="text-center">
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setGameResult(null)
                  setAnswer('')
                  setStartingWord('')
                }}
              >
                Try Another
              </Button>
            </div>
          </Card.Body>
        </Card>
      )}

      {/* Bin Details Modal */}
      <Modal
        show={showBinModal}
        onHide={() => {
          setShowBinModal(false)
          setSelectedGuess(null)
          setBinsData(null)
        }}
        size="lg"
        scrollable
      >
        <Modal.Header closeButton>
          <Modal.Title>
            Bin Details for Guess #{selectedGuess?.guessNumber}: {selectedGuess?.guess}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedGuess && binsData && (
            <>
              <div className="mb-4">
                <h6>Guess Information</h6>
                <div className="d-flex align-items-center gap-2 mb-3">
                  <Badge bg="secondary">#{selectedGuess.guessNumber}</Badge>
                  <div className="d-flex gap-1">
                    {selectedGuess.guess.split('').map((letter, letterIndex) => {
                      const colors = getEvaluationColor(selectedGuess.evaluation)
                      return (
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
                      )
                    })}
                  </div>
                  <code className="ms-auto">{selectedGuess.evaluation}</code>
                </div>
                <div className="text-muted small">
                  <div><strong>Strategy:</strong> {selectedGuess.strategy}</div>
                  <div className="mt-1">
                    <strong>Words before this guess:</strong> {selectedGuess.remainingWordsPreGuess} |
                    <strong> Words after:</strong> {selectedGuess.remainingWordsPostGuess}
                  </div>
                </div>
              </div>

              <div>
                <h6>Bin Distribution</h6>
                <p className="text-muted small mb-3">
                  Click on any evaluation pattern to see the words that would produce that pattern.
                </p>
                <div className="d-flex flex-column gap-2">
                  {Object.entries(binsData)
                    .sort(([keyA, valA], [keyB, valB]) => {
                      const countA = Array.isArray(valA) ? valA.length : valA
                      const countB = Array.isArray(valB) ? valB.length : valB
                      return countB - countA
                    })
                    .map(([evaluation, words]) => {
                      const count = Array.isArray(words) ? words.length : words
                      const isActualResult = evaluation === selectedGuess.evaluation.replace(/[^GY]/g, '-')

                      return (
                        <div
                          key={evaluation}
                          className={`border rounded p-2 ${isActualResult ? 'border-primary bg-secondary' : ''}`}
                        >
                          <div className="d-flex align-items-center justify-content-between">
                            <div className="d-flex align-items-center gap-2">
                              <div className="d-flex gap-1">
                                {evaluation.split('').map((char, index) => (
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
                                <Badge bg="success" className="ms-1">Actual Result</Badge>
                              )}
                            </div>
                            <small className="text-muted">
                              {count > 0 && `${((count / selectedGuess.remainingWordsPreGuess) * 100).toFixed(1)}%`}
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
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => {
              setShowBinModal(false)
              setSelectedGuess(null)
              setBinsData(null)
            }}
          >
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  )
}

function getColorForEvaluation(colorBadge) {
  if (colorBadge === 'success') return '#28a745'
  if (colorBadge === 'warning') return '#ffc107'
  if (colorBadge === 'secondary') return '#6c757d'
  return '#6c757d'
}
