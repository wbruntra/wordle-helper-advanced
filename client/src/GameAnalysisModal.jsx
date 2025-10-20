import { useState, useEffect } from 'react'
import Modal from 'react-bootstrap/Modal'
import Button from 'react-bootstrap/Button'
import { compareGuessWithOptimal } from './advancedUtils'
import Guess from './Guess'

/**
 * Modal component that shows turn-by-turn analysis of a Wordle game
 * Compares each user guess with the optimal guess for that game state
 */
function GameAnalysisModal({ show, handleClose, guesses, wordList, answer = null }) {
  const [currentTurn, setCurrentTurn] = useState(0)
  const [turnAnalyses, setTurnAnalyses] = useState([])

  useEffect(() => {
    if (!show || !guesses || guesses.length === 0) {
      return
    }

    // Analyze each turn
    const analyses = []
    for (let i = 0; i < guesses.length; i++) {
      const guessHistory = guesses.slice(0, i + 1).map((g) => g.word)
      const keyHistory = guesses.slice(0, i + 1).map((g) => g.key)

      try {
        const analysis = compareGuessWithOptimal(
          guessHistory,
          keyHistory,
          answer, // Can be null - used only for filtering
          wordList,
          {
            maxWordListForOptimal: 2000,
            maxOptimalCandidates: 900,
            candidateStrategy: 'sample',
          },
        )
        analyses.push(analysis)
      } catch (error) {
        console.error('Error analyzing turn', i + 1, error)
        analyses.push(null)
      }
    }

    setTurnAnalyses(analyses)
    setCurrentTurn(0)
  }, [show, guesses, wordList, answer])

  const handlePrevious = () => {
    if (currentTurn > 0) {
      setCurrentTurn(currentTurn - 1)
    }
  }

  const handleNext = () => {
    if (currentTurn < guesses.length - 1) {
      setCurrentTurn(currentTurn + 1)
    }
  }

  if (!guesses || guesses.length === 0) {
    return null
  }

  const currentAnalysis = turnAnalyses[currentTurn]
  const currentGuess = guesses[currentTurn]
  const optimalEntry = currentAnalysis?.optimalGuess?.[0]
  const optimalAnalysis = optimalEntry?.analysis
  const optimalWord = optimalEntry?.word
  const optimalReason =
    currentAnalysis?.comparison?.optimalUnavailableReason || optimalEntry?.reason

  return (
    <Modal show={show} onHide={handleClose} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>
          Game Analysis - Turn {currentTurn + 1} of {guesses.length}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {currentAnalysis ? (
          <div>
            <div className="mb-4">
              <h5>Remaining Possible Words: {currentAnalysis.filteredWordListSize}</h5>
            </div>

            {/* User's Guess Analysis */}
            <div className="mb-4 p-3 border rounded">
              <h5 className="mb-3">Your Guess</h5>
              <div className="mb-3">
                <Guess guess={currentGuess} />
              </div>
              <div className="row">
                <div className="col-md-6">
                  <p>
                    <strong>Unique Patterns Created:</strong>{' '}
                    {currentAnalysis.userGuess.analysis.binsCount}
                  </p>
                  <p>
                    <strong>Average Bin Size:</strong>{' '}
                    {currentAnalysis.userGuess.analysis.avgBinSize.toFixed(2)}
                  </p>
                </div>
                <div className="col-md-6">
                  <p>
                    <strong>Distribution Score:</strong>{' '}
                    {currentAnalysis.comparison.distributionScore.user.toFixed(2)}
                  </p>
                  <p>
                    <strong>Bin Sizes Range:</strong>{' '}
                    {currentAnalysis.userGuess.analysis.minBinSize} -{' '}
                    {currentAnalysis.userGuess.analysis.maxBinSize}
                  </p>
                </div>
              </div>
            </div>

            {/* Optimal Guess Analysis */}
            <div className="mb-4 p-3 border rounded bg-secondary">
              <h5 className="mb-3">Optimal Guess</h5>
              {optimalAnalysis && optimalWord ? (
                <>
                  <div className="mb-3">
                    <div className="guess">
                      <Guess
                        guess={{
                          word: optimalWord,
                          key: '-----',
                        }}
                      />
                    </div>
                  </div>
                  <div className="row">
                    <div className="col-md-6">
                      <p>
                        <strong>Unique Patterns Created:</strong> {optimalAnalysis.binsCount}
                      </p>
                      <p>
                        <strong>Average Bin Size:</strong> {optimalAnalysis.avgBinSize.toFixed(2)}
                      </p>
                    </div>
                    <div className="col-md-6">
                      <p>
                        <strong>Distribution Score:</strong>{' '}
                        {currentAnalysis.comparison.distributionScore.optimal.toFixed(2)}
                      </p>
                      <p>
                        <strong>Bin Sizes Range:</strong> {optimalAnalysis.minBinSize} -{' '}
                        {optimalAnalysis.maxBinSize}
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <p className="mb-0">
                  {optimalReason || 'Optimal guess unavailable for this turn due to data limits.'}
                </p>
              )}
            </div>

            {/* Comparison Summary */}
            <div className="p-3 border rounded">
              <h5 className="mb-3">Comparison</h5>
              <p>
                <strong>Patterns Advantage:</strong>{' '}
                {typeof currentAnalysis.comparison.binsAdvantage === 'number' ? (
                  currentAnalysis.comparison.binsAdvantage > 0 ? (
                    <span className="text-warning">
                      Optimal creates {currentAnalysis.comparison.binsAdvantage} more unique
                      patterns
                    </span>
                  ) : currentAnalysis.comparison.binsAdvantage === 0 ? (
                    <span className="text-success">Your guess is optimal!</span>
                  ) : (
                    <span className="text-success">
                      Your guess creates
                      {Math.abs(currentAnalysis.comparison.binsAdvantage)} more unique patterns!
                    </span>
                  )
                ) : (
                  <span className="text-muted">Comparison unavailable.</span>
                )}
              </p>
              <p>
                <strong>Score Difference:</strong>{' '}
                {typeof currentAnalysis.comparison.distributionScore.optimal === 'number'
                  ? (
                      currentAnalysis.comparison.distributionScore.optimal -
                      currentAnalysis.comparison.distributionScore.user
                    ).toFixed(2)
                  : 'N/A'}
              </p>
              {optimalReason && (
                <p className="text-muted mb-0">
                  <strong>Note:</strong> {optimalReason}
                </p>
              )}
            </div>
          </div>
        ) : (
          <p>Loading analysis...</p>
        )}
      </Modal.Body>
      <Modal.Footer>
        <div className="d-flex justify-content-between w-100">
          <Button variant="secondary" onClick={handlePrevious} disabled={currentTurn === 0}>
            Previous Turn
          </Button>
          <span>
            Turn {currentTurn + 1} / {guesses.length}
          </span>
          <Button
            variant="secondary"
            onClick={handleNext}
            disabled={currentTurn === guesses.length - 1}
          >
            Next Turn
          </Button>
        </div>
      </Modal.Footer>
    </Modal>
  )
}

export default GameAnalysisModal
