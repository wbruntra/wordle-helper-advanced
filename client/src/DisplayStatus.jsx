import { applyGuesses, filterWordsUsingGuessResult, getBins } from './utils'
import { useEffect, useState } from 'react'
import {
  weightKeys,
  wordsAtOrBelowLimit,
  findNextGuessProbability,
  countPossibleKeys,
} from './scorers'

import Guess from './Guess'
import _ from 'lodash'

const toPct = (fraction) => {
  return (fraction * 100).toFixed(2) + '%'
}

const removeIdx = (arr, idx) => {
  return [...arr.slice(0, idx), ...arr.slice(idx + 1)]
}

const orderEntireWordList = (
  filteredList,
  { only_filtered = false, orderByWeight = false, startingList } = {},
) => {
  const maximizeUniqueness = wordsAtOrBelowLimit(1)
  if (filteredList.length === startingList.length) {
    return []
  }
  let results

  const scoringFunction = countPossibleKeys

  results = filteredList.map((word) => {
    const fullBins = getBins(word, filteredList, { returnObject: true })
    const bins = Object.values(fullBins)
    return {
      word,
      score: scoringFunction(bins),
      weightedScore: weightKeys(fullBins) / (filteredList.length * 15),
    }
  })

  const filteredOrder = _.orderBy(results, (o) => o.score, 'desc')
  if (!(only_filtered || filteredOrder[0].score === filteredList.length)) {
    results = startingList.map((word) => {
      const fullBins = getBins(word, filteredList, { returnObject: true })
      const bins = Object.values(fullBins)
      return {
        word,
        score: scoringFunction(bins),
        weightedScore: weightKeys(fullBins) / (filteredList.length * 15),
      }
    })
  }

  if (orderByWeight) {
    return _.orderBy(results, (o) => o.weightedScore, 'desc')
  }

  return _.orderBy(results, (o) => o.score, 'desc')
}

function BinsTable({ bins }) {
  const binSizes = bins.map((bin) => Object.values(bin)[0].length)
  const uniqueWords = _.sum(binSizes.filter((size) => size === 1))
  const limits = [5, 20]
  const summaryStats = limits.map((limit) => {
    const scorer = wordsAtOrBelowLimit(limit)
    return {
      limit,
      wordCount: scorer(binSizes),
    }
  })
  const totalWords = _.sum(binSizes)

  return (
    <>
      <table className="table table-dark table-striped mt-4 w-100">
        <thead>
          <tr>
            <th scope="col">KEY</th>
            <th scope="col">WORDS</th>
            <th scope="col"># OF MATCHES</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ width: '35%' }}>Chance of unique answer</td>
            <td>{toPct(uniqueWords / totalWords)}</td>
            <td>{uniqueWords}</td>
          </tr>
          {summaryStats.map((smry, i) => (
            <tr key={`limit-${smry.limit}`}>
              <td>Chance of ≤ {smry.limit}</td>
              <td>{toPct(smry.wordCount / totalWords)}</td>
              <td>{smry.wordCount}</td>
            </tr>
          ))}
          {bins.map((bin, i) => {
            const matches = Object.values(bin)[0].length
            return (
              <tr key={`bin-${i}`}>
                <td>{Object.keys(bin)[0]}</td>
                <td>
                  {matches < 20
                    ? Object.values(bin)[0].join(', ')
                    : `[${matches > 600 ? 'way ' : ''}too many to show]`}
                </td>
                <td>{matches}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </>
  )
}

function DisplayStatus({
  guesses,
  setGuesses,
  resetGuesses,
  startingList,
  removeGuess,
  onGuessClick, // Updated prop
}) {
  const [showDepth, setShowDepth] = useState(false)
  const [usingOnlyFiltered, setUsingOnlyFiltered] = useState(true)
  const [countOnly, setCountOnly] = useState(true)
  const [currentFilteredList, setFiltered] = useState(startingList.slice())
  const [error, setError] = useState('')
  const [bins, setBins] = useState([])
  const [binsWord, setBinsWord] = useState('')
  const [orderedWords, setOrderedWords] = useState([])

  useEffect(() => {
    let localFiltered = applyGuesses(startingList, guesses)
    setFiltered(localFiltered)

    if (localFiltered.length === 0) {
      setError('Something went wrong. Maybe you put in the wrong evaluation?')
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
  }, [guesses, usingOnlyFiltered, startingList])

  useEffect(() => {
    if (guesses.length > 0 && showDepth) {
      const lastGuess = guesses.slice(-1)[0]
      createBinsForGuess(lastGuess.word)
    }
  }, [guesses, showDepth])

  const createBinsForGuess = (word) => {
    let localFiltered = startingList.slice()
    for (const guess of guesses) {
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
        {guesses.map((guess, i) => {
          const currentGuesses = guesses.slice(0, i + 1)
          const filtered = applyGuesses(startingList, currentGuesses)
          return (
            <div
              className="guess selectable-guess mb-3 d-flex flex-row justify-content-center align-items-center"
              key={`guess-${i}`}
            >
              <div style={{ width: '38px', fontSize: '.6em' }} className="remaining-words">
                {filtered.length}
              </div>
              <div
                className="d-inline selectable"
                onClick={() => onGuessClick(i)} // Trigger editing
              >
                <Guess guess={guess} />
              </div>
              <div className="ms-1">
                <span
                  className="delete selectable"
                  onClick={() => {
                    setError('')
                    removeGuess(i)
                    setGuesses(removeIdx(guesses, i))
                  }}
                >
                  x
                </span>
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
      {guesses.length > 0 && (
        <>
          <div>
            <button className="btn btn-primary btn-sm mb-3" onClick={resetGuesses}>
              Clear Guesses
            </button>
            <p>
              There {currentFilteredList.length === 1 ? 'is ' : 'are'}
              <span className="mx-2 fw-bold">{currentFilteredList.length}</span>word
              {currentFilteredList.length === 1 ? '' : 's'} left
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
      {guesses.length > 0 && !countOnly && (
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
                createBinsForGuess(guesses[guesses.length - 1].word)
              }}
            >
              Show Analysis for Last Guess
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
