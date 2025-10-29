import { useState } from 'react'
import { trpc } from './trpc'

interface HistoryEntry {
  guess: string
  evaluation: string
}

const TestPage = () => {
  const [name, setName] = useState('')
  const [guess, setGuess] = useState('')
  const [answer, setAnswer] = useState('')
  const [gameHistory, setGameHistory] = useState<HistoryEntry[]>([])
  const [currentGuessNumber, setCurrentGuessNumber] = useState(1)

  // tRPC queries
  const helloQuery = trpc.hello.useQuery({ name: name || undefined })
  const wordleStatusQuery = trpc.getWordleStatus.useQuery()
  const isValidInput = guess.length === 5 && answer.length === 5
  const evaluateWordQuery = trpc.evaluateWord.useQuery(
    { guess, answer },
    { enabled: isValidInput }
  )

  // Get best guess based on history
  const getPreviousGuessAndEval = () => {
    if (gameHistory.length === 0) return { previousGuess: undefined, previousEvaluation: undefined }
    const last = gameHistory[gameHistory.length - 1]
    return { previousGuess: last.guess, previousEvaluation: last.evaluation }
  }

  const { previousGuess, previousEvaluation } = getPreviousGuessAndEval()

  const bestGuessQuery = trpc.getBestGuess.useQuery(
    {
      history: gameHistory,
      guessNumber: currentGuessNumber,
      previousGuess,
      previousEvaluation,
    },
    { enabled: gameHistory.length > 0 }
  )

  return (
    <div className="container mt-5">
      <h1>tRPC Test Page</h1>
      <p>This page tests the tRPC connection between frontend and backend.</p>

      {/* Hello World Test */}
      <div className="card mb-4">
        <div className="card-header">
          <h3>Hello World Test</h3>
        </div>
        <div className="card-body">
          <div className="mb-3">
            <label htmlFor="name" className="form-label">Name (optional):</label>
            <input
              id="name"
              type="text"
              className="form-control"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
            />
          </div>
          <button
            className="btn btn-primary me-2"
            onClick={() => helloQuery.refetch()}
            disabled={helloQuery.isLoading}
          >
            {helloQuery.isLoading ? 'Loading...' : 'Say Hello'}
          </button>
          {helloQuery.data && (
            <div className="alert alert-success mt-3">
              <strong>Response:</strong> {helloQuery.data.greeting}
              <br />
              <small className="text-muted">Timestamp: {helloQuery.data.timestamp}</small>
            </div>
          )}
          {helloQuery.error && (
            <div className="alert alert-danger mt-3">
              <strong>Error:</strong> {helloQuery.error.message}
            </div>
          )}
        </div>
      </div>

      {/* Wordle Status Test */}
      <div className="card mb-4">
        <div className="card-header">
          <h3>Wordle Status Test</h3>
        </div>
        <div className="card-body">
          <button
            className="btn btn-info me-2"
            onClick={() => wordleStatusQuery.refetch()}
            disabled={wordleStatusQuery.isLoading}
          >
            {wordleStatusQuery.isLoading ? 'Loading...' : 'Get Wordle Status'}
          </button>
          {wordleStatusQuery.data && (
            <div className="alert alert-info mt-3">
              <strong>Status:</strong> {wordleStatusQuery.data.status}
              <br />
              <strong>Message:</strong> {wordleStatusQuery.data.message}
              <br />
              <strong>Features:</strong> {wordleStatusQuery.data.features.join(', ')}
              <br />
              <strong>Version:</strong> {wordleStatusQuery.data.version}
            </div>
          )}
          {wordleStatusQuery.error && (
            <div className="alert alert-danger mt-3">
              <strong>Error:</strong> {wordleStatusQuery.error.message}
            </div>
          )}
        </div>
      </div>

      {/* Word Evaluation Test */}
      <div className="card mb-4">
        <div className="card-header">
          <h3>Word Evaluation Test</h3>
        </div>
        <div className="card-body">
          <div className="row mb-3">
            <div className="col-md-6">
              <label htmlFor="guess" className="form-label">Guess (5 letters):</label>
              <input
                id="guess"
                type="text"
                className="form-control"
                value={guess}
                onChange={(e) => setGuess(e.target.value.toUpperCase())}
                placeholder="Enter guess"
                maxLength={5}
              />
            </div>
            <div className="col-md-6">
              <label htmlFor="answer" className="form-label">Answer (5 letters):</label>
              <input
                id="answer"
                type="text"
                className="form-control"
                value={answer}
                onChange={(e) => setAnswer(e.target.value.toUpperCase())}
                placeholder="Enter answer"
                maxLength={5}
              />
            </div>
          </div>
          {evaluateWordQuery.data && (
            <div className="alert alert-success mt-3">
              <strong>Guess:</strong> {evaluateWordQuery.data.guess}
              <br />
              <strong>Answer:</strong> {evaluateWordQuery.data.answer}
              <br />
              <strong>Evaluation:</strong>
              <span className="ms-2">
                {evaluateWordQuery.data.evaluation.split('').map((char: string, index: number) => (
                  <span
                    key={index}
                    className={`badge me-1 ${
                      char === 'G' ? 'bg-success' :
                      char === 'Y' ? 'bg-warning' : 'bg-secondary'
                    }`}
                  >
                    {char}
                  </span>
                ))}
              </span>
              <br />
              <strong>Correct:</strong> {evaluateWordQuery.data.isCorrect ? '✅ Yes' : '❌ No'}
            </div>
          )}
          {evaluateWordQuery.error && (
            <div className="alert alert-danger mt-3">
              <strong>Error:</strong> {evaluateWordQuery.error.message}
            </div>
          )}
          {evaluateWordQuery.isLoading && (
            <div className="alert alert-info mt-3">
              <strong>Evaluating...</strong>
            </div>
          )}
        </div>
      </div>

      {/* Solver Game */}
      <div className="card mb-4">
        <div className="card-header">
          <h3>Solver Game</h3>
        </div>
        <div className="card-body">
          <p>Build a game history and get AI recommendations for the best next guess!</p>

          {/* Game History */}
          <div className="mb-4">
            <h5>Game History (Guess #{currentGuessNumber})</h5>
            {gameHistory.length === 0 ? (
              <p className="text-muted">No guesses yet. Start adding guesses to build history.</p>
            ) : (
              <div className="table-responsive">
                <table className="table table-sm table-bordered">
                  <thead>
                    <tr>
                      <th>Guess #</th>
                      <th>Word</th>
                      <th>Evaluation</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gameHistory.map((entry, index) => (
                      <tr key={index}>
                        <td>{index + 1}</td>
                        <td>
                          <strong>{entry.guess}</strong>
                        </td>
                        <td>
                          <span>
                            {entry.evaluation.split('').map((char: string, i: number) => (
                              <span
                                key={i}
                                className={`badge me-1 ${
                                  char === 'G'
                                    ? 'bg-success'
                                    : char === 'Y'
                                    ? 'bg-warning'
                                    : 'bg-secondary'
                                }`}
                              >
                                {char}
                              </span>
                            ))}
                          </span>
                        </td>
                        <td>
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={() => {
                              setGameHistory(gameHistory.filter((_, i) => i !== index))
                              setCurrentGuessNumber(Math.max(1, currentGuessNumber - 1))
                            }}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Add to History */}
          <div className="mb-4 p-3 bg-secondary rounded">
            <h6>Add to History</h6>
            <div className="row mb-3">
              <div className="col-md-6">
                <label htmlFor="historyGuess" className="form-label">
                  Guess:
                </label>
                <input
                  id="historyGuess"
                  type="text"
                  className="form-control"
                  value={guess}
                  onChange={(e) => setGuess(e.target.value.toUpperCase())}
                  placeholder="5 letters"
                  maxLength={5}
                />
              </div>
              <div className="col-md-6">
                <label htmlFor="historyEval" className="form-label">
                  Evaluation:
                </label>
                <input
                  id="historyEval"
                  type="text"
                  className="form-control"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value.toUpperCase())}
                  placeholder="G/Y/- only"
                  maxLength={5}
                />
              </div>
            </div>
            <button
              className="btn btn-primary"
              onClick={() => {
                if (isValidInput) {
                  setGameHistory([...gameHistory, { guess, evaluation: answer }])
                  setCurrentGuessNumber(currentGuessNumber + 1)
                  setGuess('')
                  setAnswer('')
                }
              }}
              disabled={!isValidInput}
            >
              Add to History
            </button>
          </div>

          {/* Best Guess Recommendation */}
          {gameHistory.length > 0 && (
            <div className="mb-4 p-3 bg-secondary rounded">
              <h6>AI Recommendation</h6>
              {bestGuessQuery.isLoading && (
                <div className="alert alert-info">
                  <strong>Getting best guess...</strong>
                </div>
              )}
              {bestGuessQuery.data && bestGuessQuery.data.error === null && (
                <div className="alert alert-success">
                  <div className="mb-2">
                    <strong>Best Guess:</strong> <span className="h5">{bestGuessQuery.data.bestGuess}</span>
                  </div>
                  <div className="mb-2">
                    <strong>Remaining Words:</strong> {bestGuessQuery.data.remainingCount}
                  </div>
                  <div className="mb-2">
                    <strong>Bins Created:</strong> {bestGuessQuery.data.bins}
                  </div>
                  <div className="mb-2">
                    <strong>Reason:</strong> {bestGuessQuery.data.reason}
                  </div>
                </div>
              )}
              {bestGuessQuery.data?.error && (
                <div className="alert alert-danger">
                  <strong>Error:</strong> {bestGuessQuery.data.error}
                </div>
              )}
              {bestGuessQuery.error && (
                <div className="alert alert-danger">
                  <strong>Error:</strong> {bestGuessQuery.error.message}
                </div>
              )}
            </div>
          )}

          {/* Clear History */}
          {gameHistory.length > 0 && (
            <button
              className="btn btn-warning"
              onClick={() => {
                setGameHistory([])
                setCurrentGuessNumber(1)
                setGuess('')
                setAnswer('')
              }}
            >
              Clear History
            </button>
          )}
        </div>
      </div>

      {/* Connection Status */}
      <div className="card">
        <div className="card-header">
          <h3>Connection Status</h3>
        </div>
        <div className="card-body">
          <div className="row">
            <div className="col-md-4">
              <strong>Hello World:</strong>
              <span className={`badge ms-2 ${helloQuery.isError ? 'bg-danger' : helloQuery.isSuccess ? 'bg-success' : 'bg-secondary'}`}>
                {helloQuery.isError ? 'Error' : helloQuery.isSuccess ? 'Connected' : 'Not Tested'}
              </span>
            </div>
            <div className="col-md-4">
              <strong>Wordle Status:</strong>
              <span className={`badge ms-2 ${wordleStatusQuery.isError ? 'bg-danger' : wordleStatusQuery.isSuccess ? 'bg-success' : 'bg-secondary'}`}>
                {wordleStatusQuery.isError ? 'Error' : wordleStatusQuery.isSuccess ? 'Connected' : 'Not Tested'}
              </span>
            </div>
            <div className="col-md-4">
              <strong>Word Eval:</strong>
              <span className={`badge ms-2 ${evaluateWordQuery.isError ? 'bg-danger' : evaluateWordQuery.isSuccess ? 'bg-success' : 'bg-secondary'}`}>
                {evaluateWordQuery.isError ? 'Error' : evaluateWordQuery.isSuccess ? 'Connected' : 'Ready'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TestPage
