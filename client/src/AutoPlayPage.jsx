import { useState } from 'react'
import { Container, Form, Button, Alert, Spinner, Card, Badge, Row, Col } from 'react-bootstrap'
import { useNavigate } from 'react-router-dom'
import { FiArrowLeft } from 'react-icons/fi'
import { trpc } from './trpc'

export default function AutoPlayPage() {
  const navigate = useNavigate()
  const [answer, setAnswer] = useState('')
  const [startingWord, setStartingWord] = useState('')
  const [error, setError] = useState('')
  const [gameResult, setGameResult] = useState(null)

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
                    <div key={index} className="border rounded p-3">
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
    </Container>
  )
}

function getColorForEvaluation(colorBadge) {
  if (colorBadge === 'success') return '#28a745'
  if (colorBadge === 'warning') return '#ffc107'
  if (colorBadge === 'secondary') return '#6c757d'
  return '#6c757d'
}
