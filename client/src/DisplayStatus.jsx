import { orderEntireWordList } from './utils'
import { applyGuesses, filterWordsUsingGuessResult, getBins } from './advancedUtils'
import { useEffect, useState } from 'react'
import _ from 'lodash'
import { BsPencil } from 'react-icons/bs'
import { TiTimes } from 'react-icons/ti'
import { useSelector, useDispatch } from 'react-redux'
import { removeGuess, setGuesses } from './redux/gameSlice'

import Guess from './Guess'
import BinsTable from './BinsTable'

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
      createBinsForGuess(wordToAnalyze)
    }
  }, [currentGuesses, showDepth, clickedGuess])

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

  return (
    <div className="d-flex flex-column">
      <div className="d-flex flex-column text-center mb-3">
        {currentGuesses.map((guess, i) => {
          const currentGuessSlice = currentGuesses.slice(0, i + 1)
          const filtered = applyGuesses(startingList, currentGuessSlice)
          return (
            <div
              className="guess selectable-guess mb-3 row justify-content-center"
              key={`guess-${i}`}
            >
              <div
                style={{ fontSize: '.6em' }}
                className="col-2 remaining-words d-flex justify-content-end align-items-center"
              >
                {filtered.length}
              </div>
              <div
                className="selectable col-8 col-md-6 d-flex align-items-center justify-content-center"
                onClick={() => {
                  setClickedGuess(guess.word)
                  if (showDepth) {
                    createBinsForGuess(guess.word)
                  }
                }}
              >
                <Guess guess={guess} />
              </div>
              <div className="col-2 d-flex flex-row align-items-center justify-content-center">
                <div
                  className="delete selectable"
                  onClick={() => {
                    setError('')
                    dispatch(removeGuess(i))
                    if (clickedGuess === guess.word) {
                      setClickedGuess(null)
                    }
                  }}
                >
                  <TiTimes />
                </div>
                <div className="edit selectable ms-2" onClick={() => onGuessClick(i)}>
                  <BsPencil />
                </div>
              </div>
            </div>
          )
        })}
      </div>
      {guesses.length === 0 && (
        <p>
          There {currentFilteredList.length === 1 ? 'is ' : 'are'} {currentFilteredList.length}{' '}
          word{currentFilteredList.length === 1 ? '' : 's'} left
        </p>
      )}
      <hr style={{ color: 'white' }} />
      {currentGuesses.length > 0 && (
        <>
          <div>
            <button className="btn btn-primary btn-sm mb-3" onClick={() => dispatch(setGuesses([]))}>
              Clear Guesses
            </button>
            <p>
              There {currentFilteredList.length === 1 ? 'is' : 'are'}
              <span className="mx-2 fw-bold">{currentFilteredList.length}</span>word
              {currentFilteredList.length === 1 ? '' : 's'} left{' '}
              {clickedGuess && `after guessing ${clickedGuess}`}
            </p>
            <button onClick={() => setCountOnly(!countOnly)} className="btn btn-dark mb-3">
              {countOnly ? 'Show Suggestions' : 'Show Word Count Only'}
            </button>
            {!countOnly && (
              <>
                {!showDepth && orderedWords.length > 0 && (
                  <>
                    <p>
                      Showing best{' '}
                      {usingOnlyFiltered ? 'among filtered' : 'overall (including eliminated)'}{' '}
                      choices
                    </p>
                    <div className="mb-2">
                      {usingOnlyFiltered ? (
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => setUsingOnlyFiltered(false)}
                        >
                          Use Full Wordlist
                        </button>
                      ) : (
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => setUsingOnlyFiltered(true)}
                        >
                          Use Only Valid Words
                        </button>
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
          </div>
        </>
      )}
      {currentGuesses.length > 0 && !countOnly && (
        <div className="container mb-3">
          {showDepth ? (
            <button className="btn btn-dark" onClick={() => setShowDepth(false)}>
              Hide Analysis
            </button>
          ) : (
            <button
              className="btn btn-dark"
              onClick={() => {
                setShowDepth(true)
                const wordToAnalyze = clickedGuess || currentGuesses[currentGuesses.length - 1].word
                createBinsForGuess(wordToAnalyze)
              }}
            >
              Show Analysis
            </button>
          )}
          {showDepth && (
            <div className="mt-3">
              <h2>{binsWord}</h2>
              <BinsTable bins={bins} />
            </div>
          )}
        </div>
      )}
      {error && <p className="error">{error}</p>}
    </div>
  )
}

export default DisplayStatus
