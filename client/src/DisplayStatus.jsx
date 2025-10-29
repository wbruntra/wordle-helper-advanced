import { orderEntireWordList } from './utils'
import { applyGuesses, filterWordsUsingGuessResult, getBins } from './advancedUtils'
import { useEffect, useState } from 'react'
import _ from 'lodash'
import { BsPencil } from 'react-icons/bs'
import { TiTimes } from 'react-icons/ti'
import { useSelector, useDispatch } from 'react-redux'
import { removeGuess, setGuesses } from './redux/gameSlice'
import { Card, Badge, Button, Container } from 'react-bootstrap'

import Guess from './Guess'
import BinsTable from './BinsTable'
import BinDetailsModal from './BinDetailsModal'

function DisplayStatus({
  guesses,
  startingList,
  onGuessClick,
}) {
  const dispatch = useDispatch()
  const currentGuesses = useSelector(state => state.game.guesses)
  const [showDepth, setShowDepth] = useState(false)
  const [usingOnlyFiltered, setUsingOnlyFiltered] = useState(true)
  const [countOnly, setCountOnly] = useState(true)
  const [currentFilteredList, setFiltered] = useState(startingList.slice())
  const [error, setError] = useState('')
  const [bins, setBins] = useState([])
  const [binsWord, setBinsWord] = useState('')
  const [orderedWords, setOrderedWords] = useState([])
  const [clickedGuess, setClickedGuess] = useState(null)
  const [showBinModal, setShowBinModal] = useState(false)
  const [modalGuessData, setModalGuessData] = useState(null)

  useEffect(() => {
    let appliedGuesses = []
    if (clickedGuess) {
      for (let i = 0; i < currentGuesses.length; i++) {
        appliedGuesses.push(currentGuesses[i])
        if (currentGuesses[i].word === clickedGuess) {
          break
        }
      }
    } else {
      appliedGuesses = currentGuesses
    }

    let localFiltered = applyGuesses(startingList, appliedGuesses)
    setFiltered(localFiltered)

    if (localFiltered.length === 0) {
      setError('Something went wrong. Maybe you put in the wrong evaluation?')
    } else {
      setError('')
    }

    let newWordOrder
    if (localFiltered.length < 500) {
      newWordOrder = orderEntireWordList(localFiltered, {
        only_filtered: usingOnlyFiltered,
        startingList,
      })
    } else {
      newWordOrder = localFiltered.map((w) => ({ word: w }))
    }
    setOrderedWords(newWordOrder)
  }, [currentGuesses, usingOnlyFiltered, startingList, clickedGuess])

  useEffect(() => {
    if (currentGuesses.length > 0 && showDepth) {
      const wordToAnalyze = clickedGuess || currentGuesses[currentGuesses.length - 1].word
      let localFiltered = startingList.slice()
      for (const guess of currentGuesses) {
        if (guess.word === wordToAnalyze) {
          break
        }
        localFiltered = filterWordsUsingGuessResult(guess, localFiltered)
      }

      let newBins = getBins(wordToAnalyze, localFiltered, { returnObject: true, showMatches: true })
      newBins = _.map(newBins, (value, key) => ({ [key]: value }))
      newBins = _.sortBy(newBins, (value) => Object.values(value)[0].length)
      setBinsWord(`${wordToAnalyze} (sorting ${localFiltered.length} words)`)
      setBins(newBins)
    }
  }, [currentGuesses, showDepth, clickedGuess, startingList])

  const createBinsForGuess = (word) => {
    let localFiltered = startingList.slice()
    for (const guess of currentGuesses) {
      if (guess.word === word) {
        break
      }
      localFiltered = filterWordsUsingGuessResult(guess, localFiltered)
    }

    let newBins = getBins(word, localFiltered, { returnObject: true, showMatches: true })
    newBins = _.map(newBins, (value, key) => ({ [key]: value }))
    newBins = _.sortBy(newBins, (value) => Object.values(value)[0].length)
    setBinsWord(`${word} (sorting ${localFiltered.length} words)`)
    setBins(newBins)
  }

  const handleGuessCardClick = (guess, index) => {
    // Get all previous guesses (excluding current one)
    const previousGuesses = currentGuesses
      .filter((g, i) => i < index)
      .map(g => ({
        word: g.word,
        key: g.key
      }))

    // Apply previous guesses to get the remaining words before this guess
    let remainingWordsBefore = startingList
    if (previousGuesses.length > 0) {
      remainingWordsBefore = applyGuesses(startingList, previousGuesses)
    }

    // Apply current guess to get remaining words after
    const guessesUpToCurrent = currentGuesses.slice(0, index + 1)
    const remainingWordsAfter = applyGuesses(startingList, guessesUpToCurrent)

    // Calculate bins for this guess
    const binsData = getBins(guess.word, remainingWordsBefore, {
      returnObject: true,
      showMatches: true
    })

    setModalGuessData({
      guess: guess.word,
      evaluation: guess.key,
      binsData,
      remainingWordsBefore: remainingWordsBefore.length,
      remainingWordsAfter: remainingWordsAfter.length,
      index
    })
    setShowBinModal(true)
  }

  return (
    <div>
      <Container className="mt-4 mb-4">
        {currentGuesses.length > 0 && (
          <>
            <h5 className="mb-3">Guess History</h5>
            <div className="d-flex flex-column gap-3 mb-4">
              {currentGuesses.map((guess, index) => {
                const guessesUpTo = currentGuesses.slice(0, index + 1)
                const remainingAfter = applyGuesses(startingList, guessesUpTo)
                const remainingBefore = index === 0 
                  ? startingList.length 
                  : applyGuesses(startingList, currentGuesses.slice(0, index)).length

                return (
                  <Card
                    key={`guess-${index}`}
                    className="border-light"
                    style={{ cursor: 'pointer', transition: 'background-color 0.2s' }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '')}
                    onClick={() => handleGuessCardClick(guess, index)}
                  >
                    <Card.Body>
                      <div className="d-flex align-items-center justify-content-between mb-3">
                        <div className="d-flex align-items-center gap-3">
                          <Badge bg="secondary">#{index + 1}</Badge>
                          <div className="selectable">
                            <Guess guess={guess} />
                          </div>
                        </div>
                        <div className="d-flex align-items-center gap-3">
                          <div className="text-end">
                            <small className="text-muted d-block">Before: {remainingBefore} words</small>
                            <small className="text-muted d-block">After: {remainingAfter.length} words</small>
                          </div>
                          <div className="d-flex gap-2">
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                setError('')
                                dispatch(removeGuess(index))
                                if (clickedGuess === guess.word) {
                                  setClickedGuess(null)
                                }
                              }}
                              title="Delete guess"
                            >
                              <TiTimes />
                            </Button>
                            <Button
                              variant="outline-primary"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                onGuessClick(index)
                              }}
                              title="Edit guess"
                            >
                              <BsPencil />
                            </Button>
                          </div>
                        </div>
                      </div>
                      <div className="text-center small text-primary" style={{ cursor: 'pointer' }}>
                        🔍 Click to see bin details
                      </div>
                    </Card.Body>
                  </Card>
                )
              })}
            </div>
          </>
        )}

        {guesses.length === 0 && (
          <p className="text-center">
            There {currentFilteredList.length === 1 ? 'is ' : 'are'} {currentFilteredList.length}{' '}
            word{currentFilteredList.length === 1 ? '' : 's'} left
          </p>
        )}

        {currentGuesses.length > 0 && (
          <>
            <hr style={{ color: 'white' }} />
            <div className="text-center mb-3">
              <Button 
                variant="primary" 
                size="sm" 
                className="me-2"
                onClick={() => dispatch(setGuesses([]))}
              >
                Clear Guesses
              </Button>
              <p className="mt-2 mb-3">
                There {currentFilteredList.length === 1 ? 'is' : 'are'}
                <span className="mx-2 fw-bold">{currentFilteredList.length}</span>word
                {currentFilteredList.length === 1 ? '' : 's'} left{' '}
                {clickedGuess && `after guessing ${clickedGuess}`}
              </p>
              <Button 
                variant="dark" 
                size="sm"
                onClick={() => setCountOnly(!countOnly)}
              >
                {countOnly ? 'Show Suggestions' : 'Show Word Count Only'}
              </Button>
            </div>

            {!countOnly && (
              <>
                {!showDepth && orderedWords.length > 0 && (
                  <>
                    <p className="text-center">
                      Showing best{' '}
                      {usingOnlyFiltered ? 'among filtered' : 'overall (including eliminated)'}{' '}
                      choices
                    </p>
                    <div className="text-center mb-3">
                      {usingOnlyFiltered ? (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => setUsingOnlyFiltered(false)}
                        >
                          Use Full Wordlist
                        </Button>
                      ) : (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => setUsingOnlyFiltered(true)}
                        >
                          Use Only Valid Words
                        </Button>
                      )}
                    </div>
                    <div className="row justify-content-center mb-3">
                      <div className="col-10">
                        <table className="table table-dark table-striped mt-3 w-100">
                          <thead>
                            <tr>
                              <th scope="col">WORD</th>
                              <th scope="col">CHANCE OF SOLVING</th>
                            </tr>
                          </thead>
                          <tbody>
                            {orderedWords.slice(0, 10).map((word, i) => (
                              <tr key={`ordered-${i}`}>
                                <td>{word.word}</td>
                                <td>
                                  {((100 * word.score) / currentFilteredList.length).toFixed(1)}%
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}
                <hr style={{ color: 'white' }} />
              </>
            )}
          </>
        )}

        {currentGuesses.length > 0 && !countOnly && (
          <div className="text-center mb-3">
            {showDepth ? (
              <Button 
                variant="dark" 
                size="sm"
                onClick={() => setShowDepth(false)}
              >
                Hide Analysis
              </Button>
            ) : (
              <Button
                variant="dark"
                size="sm"
                onClick={() => {
                  setShowDepth(true)
                  const wordToAnalyze = clickedGuess || currentGuesses[currentGuesses.length - 1].word
                  createBinsForGuess(wordToAnalyze)
                }}
              >
                Show Analysis
              </Button>
            )}
            {showDepth && (
              <div className="mt-3">
                <h2>{binsWord}</h2>
                <BinsTable bins={bins} />
              </div>
            )}
          </div>
        )}
        {error && <p className="error text-center">{error}</p>}
      </Container>

      <BinDetailsModal
        show={showBinModal}
        onHide={() => {
          setShowBinModal(false)
          setModalGuessData(null)
        }}
        guess={modalGuessData?.guess}
        evaluation={modalGuessData?.evaluation}
        binsData={modalGuessData?.binsData}
        remainingWordsBefore={modalGuessData?.remainingWordsBefore}
      />
    </div>
  )
}

export default DisplayStatus
