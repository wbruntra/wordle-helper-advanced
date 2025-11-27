import { useState, useEffect } from 'react'
import Modal from 'react-bootstrap/Modal'
import Button from 'react-bootstrap/Button'
import { compareGuessWithOptimal } from './advancedUtils'
import ResponsiveGuess from './ResponsiveGuess'

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
    <Modal show={show} onHide={handleClose} size="lg" centered scrollable>
      <Modal.Header closeButton>
        <Modal.Title>
          How You Did — Guess {currentTurn + 1} of {guesses.length}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {currentAnalysis ? (
          <div>
            <div className="mb-4">
              <h5>
                {currentAnalysis.filteredWordListSize === 1
                  ? 'Only 1 word left — you\'ve got it!'
                  : `${currentAnalysis.filteredWordListSize} possible words remaining`}
              </h5>
            </div>

            <div className="row g-3">
              {/* User's Guess Analysis */}
              <div className="col-12 col-lg-6">
                <div className="h-100 p-3 border rounded">
                  <h5 className="mb-3">What You Played</h5>
                  <div className="mb-3">
                    <ResponsiveGuess guess={currentGuess} size="md" />
                  </div>
                  <div className="row">
                    <div className="col-12">
                      <p className="mb-1">
                        <strong>Patterns created:</strong>{' '}
                        {currentAnalysis.userGuess.analysis.binsCount}
                      </p>
                      <p className="mb-1">
                        <strong>Avg words per pattern:</strong>{' '}
                        {currentAnalysis.userGuess.analysis.avgBinSize.toFixed(2)}
                      </p>
                      <p className="mb-1">
                        <strong>Information score:</strong>{' '}
                        {currentAnalysis.comparison.distributionScore.user.toFixed(2)}
                      </p>
                      <p className="mb-0">
                        <strong>Pattern size range:</strong> {currentAnalysis.userGuess.analysis.minBinSize}{' '}
                        to {currentAnalysis.userGuess.analysis.maxBinSize}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Optimal Guess Analysis */}
              <div className="col-12 col-lg-6">
                <div className="h-100 p-3 border rounded bg-secondary">
                  <h5 className="mb-3">Best Available Move</h5>
                  {optimalAnalysis && optimalWord ? (
                    <>
                      <div className="mb-3">
                        <ResponsiveGuess word={optimalWord} keyVal="-----" size="md" />
                      </div>
                      <div className="row">
                        <div className="col-12">
                          <p className="mb-1">
                            <strong>Patterns created:</strong> {optimalAnalysis.binsCount}
                          </p>
                          <p className="mb-1">
                            <strong>Avg words per pattern:</strong> {optimalAnalysis.avgBinSize.toFixed(2)}
                          </p>
                          <p className="mb-1">
                            <strong>Information score:</strong>{' '}
                            {currentAnalysis.comparison.distributionScore.optimal.toFixed(2)}
                          </p>
                          <p className="mb-0">
                            <strong>Pattern size range:</strong> {optimalAnalysis.minBinSize} to{' '}
                            {optimalAnalysis.maxBinSize}
                          </p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="mb-0">
                      {optimalReason ||
                        'We couldn\'t calculate the best move for this turn — too many possibilities to analyze.'}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Comparison Summary */}
            <div className="mt-4 p-3 border rounded">
              <h5 className="mb-3">The Verdict</h5>
              <p>
                {typeof currentAnalysis.comparison.binsAdvantage === 'number' ? (
                  currentAnalysis.comparison.binsAdvantage > 0 ? (
                    <span className="text-warning">
                      The best move would have created {currentAnalysis.comparison.binsAdvantage} more
                      pattern{currentAnalysis.comparison.binsAdvantage !== 1 ? 's' : ''}, giving you more information to work with.
                    </span>
                  ) : currentAnalysis.comparison.binsAdvantage === 0 ? (
                    <span className="text-success">Nice! You played the optimal move. 🎯</span>
                  ) : (
                    <span className="text-success">
                      Great choice! Your guess actually created {Math.abs(currentAnalysis.comparison.binsAdvantage)} more
                      pattern{Math.abs(currentAnalysis.comparison.binsAdvantage) !== 1 ? 's' : ''} than our suggestion! 🌟
                    </span>
                  )
                ) : (
                  <span className="text-muted">We couldn't compare this turn.</span>
                )}
              </p>
              <p className="mb-0">
                <strong>Score difference:</strong>{' '}
                {typeof currentAnalysis.comparison.distributionScore.optimal === 'number'
                  ? (() => {
                      const diff = (
                        currentAnalysis.comparison.distributionScore.optimal -
                        currentAnalysis.comparison.distributionScore.user
                      ).toFixed(2)
                      return diff > 0 ? `+${diff} for best move` : diff < 0 ? `You did ${Math.abs(diff)} better!` : 'Even'
                    })()
                  : 'N/A'}
              </p>
              {optimalReason && (
                <p className="text-muted mt-2 mb-0">
                  <em>{optimalReason}</em>
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-5">
            <p>Crunching the numbers...</p>
          </div>
        )}
      </Modal.Body>
      <Modal.Footer>
        <div className="d-flex justify-content-between w-100 align-items-center">
          <Button
            variant="secondary"
            onClick={handlePrevious}
            disabled={currentTurn === 0}
            className="flex-grow-1 me-2"
          >
            ← Previous
          </Button>
          <span className="text-nowrap mx-2">
            Guess {currentTurn + 1} of {guesses.length}
          </span>
          <Button
            variant="secondary"
            onClick={handleNext}
            disabled={currentTurn === guesses.length - 1}
            className="flex-grow-1 ms-2"
          >
            Next →
          </Button>
        </div>
      </Modal.Footer>
    </Modal>
  )
}

export default GameAnalysisModal
