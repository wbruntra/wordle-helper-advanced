import { orderEntireWordList } from './utils'
import { applyGuesses, filterWordsUsingGuessResult, getBins, evaluateToString } from './advancedUtils'
import { useEffect, useState } from 'react'
import _ from 'lodash'
import { BsPencil } from 'react-icons/bs'
import { TiTimes } from 'react-icons/ti'
import { useSelector, useDispatch } from 'react-redux'
import { removeGuess, setGuesses } from './redux/gameSlice'
import { Badge, Button, Container, Spinner } from 'react-bootstrap'

import BinsTable from './BinsTable'
import BinDetailsModal from './BinDetailsModal'
import { trpc } from './trpc'
import type { RootState } from './redux/store'

interface DisplayStatusProps {
  guesses: any[]
  startingList: string[]
  onGuessClick: (index: number) => void
  answer?: string
}

interface WordScore {
  word: string
  score?: number
}

interface BestGuessInfo {
  reason: string
  binsCount?: number
  avgBinSize?: number | null
  distributionScore?: number | null
}

interface BestGuessData {
  word: string
  evaluation: string | null
  binsData: Record<string, string[] | number>
  info: BestGuessInfo
}

interface ModalGuessData {
  guess: string
  evaluation: string
  binsData: Record<string, string[] | number>
  remainingWordsBefore: number
  remainingWordsAfter: number
  index: number
  bestGuess?: BestGuessData | null
}

type BinObject = Record<string, { [key: string]: string[] | number }>

function DisplayStatus({
  guesses,
  startingList,
  onGuessClick,
  answer,
}: DisplayStatusProps) {
  const dispatch = useDispatch()
  const currentGuesses = useSelector((state: RootState) => state.game.guesses)
  const [showDepth, setShowDepth] = useState(false)
  const [usingOnlyFiltered, setUsingOnlyFiltered] = useState(true)
  const [countOnly, setCountOnly] = useState(true)
  const [currentFilteredList, setFiltered] = useState<string[]>(startingList.slice())
  const [error, setError] = useState('')
  const [bins, setBins] = useState<BinObject[]>([])
  const [binsWord, setBinsWord] = useState('')
  const [orderedWords, setOrderedWords] = useState<WordScore[]>([])
  const [clickedGuess, setClickedGuess] = useState<string | null>(null)
  const [showBinModal, setShowBinModal] = useState(false)
  const [modalGuessData, setModalGuessData] = useState<ModalGuessData | null>(null)
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false)
  
  const trpcUtils = trpc.useUtils()

  useEffect(() => {
    let appliedGuesses: any[] = []
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

    if (!countOnly && localFiltered.length < 1500) {
      setIsLoadingSuggestions(true)
      // Use setTimeout to allow React to render the loading state first
      setTimeout(() => {
        const newWordOrder = orderEntireWordList(localFiltered, {
          only_filtered: usingOnlyFiltered,
          startingList,
        })
        setOrderedWords(newWordOrder)
        setIsLoadingSuggestions(false)
      }, 0)
    } else {
      const newWordOrder = localFiltered.map((w) => ({ word: w }))
      setOrderedWords(newWordOrder)
      setIsLoadingSuggestions(false)
    }
  }, [currentGuesses, usingOnlyFiltered, startingList, clickedGuess, countOnly])

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

      let newBins: any = getBins(wordToAnalyze, localFiltered, { returnObject: true, showMatches: true })
      newBins = _.map(newBins, (value, key) => ({ [key]: value }))
      newBins = _.sortBy(newBins, (value: any) => (Object.values(value)[0] as any).length)
      setBinsWord(`${wordToAnalyze} (sorting ${localFiltered.length} words)`)
      setBins(newBins)
    }
  }, [currentGuesses, showDepth, clickedGuess, startingList])

  const getEvaluationColor = (evaluation: string): string[] => {
    const colors: string[] = []
    for (let i = 0; i < evaluation.length; i++) {
      const char = evaluation[i]
      if (char === 'G') colors.push('success')
      else if (char === 'Y') colors.push('warning')
      else colors.push('secondary')
    }
    return colors
  }

  const getColorForEvaluation = (colorBadge: string): string => {
    if (colorBadge === 'success') return '#28a745'
    if (colorBadge === 'warning') return '#ffc107'
    if (colorBadge === 'secondary') return '#6c757d'
    return '#6c757d'
  }

  const createBinsForGuess = (word: string) => {
    let localFiltered = startingList.slice()
    for (const guess of currentGuesses) {
      if (guess.word === word) {
        break
      }
      localFiltered = filterWordsUsingGuessResult(guess, localFiltered)
    }

    let newBins: any = getBins(word, localFiltered, { returnObject: true, showMatches: true })
    newBins = _.map(newBins, (value: any, key: any) => ({ [key]: value }))
    newBins = _.sortBy(newBins, (value: any) => (Object.values(value)[0] as any).length)
    setBinsWord(`${word} (sorting ${localFiltered.length} words)`)
    setBins(newBins)
  }

  const handleGuessCardClick = async (guess: any, index: number) => {
    // Get all previous guesses (excluding current one)
    const previousGuesses = currentGuesses
      .filter((_g, i) => i < index)
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

    // Determine the actual answer (from input or if list is down to 1)
    let knownAnswer: string | null = null
    if (answer && answer.length === 5) {
      knownAnswer = answer.toUpperCase()
    } else if (remainingWordsAfter.length === 1) {
      knownAnswer = remainingWordsAfter[0]
    }

    // Calculate the optimal guess for this state
    let bestGuessData: BestGuessData | null = null
    const maxWordListForOptimal = 2000
    
    if (remainingWordsBefore.length <= maxWordListForOptimal) {
      try {
        // Use tRPC to get the best guess from the backend
        const result = await trpcUtils.getBestGuess.fetch({
          history: previousGuesses.map(g => ({
            guess: g.word,
            evaluation: g.key
          })),
          guessNumber: index + 1,
        })

        if (result && result.bestGuess && !result.error) {
          const bestGuess = result.bestGuess
          
          // Calculate bins for the best guess
          const bestBinsData = getBins(bestGuess, remainingWordsBefore, {
            returnObject: true,
            showMatches: true
          })
          
          // Calculate evaluation if we know the answer
          let bestEvaluation: string | null = null
          if (knownAnswer) {
            bestEvaluation = evaluateToString(bestGuess, knownAnswer)
          }
          
          bestGuessData = {
            word: bestGuess,
            evaluation: bestEvaluation,
            binsData: bestBinsData as Record<string, string[] | number>,
            info: {
              reason: result.reason || 'Optimal guess from backend',
              binsCount: result.bins,
              avgBinSize: result.bins ? parseFloat((result.remainingCount / result.bins).toFixed(2)) : null,
              distributionScore: null
            }
          }
        }
      } catch (error) {
        console.error('Error fetching optimal guess from backend:', error)
      }
    }

    setModalGuessData({
      guess: guess.word,
      evaluation: guess.key,
      binsData: binsData as Record<string, string[] | number>,
      remainingWordsBefore: remainingWordsBefore.length,
      remainingWordsAfter: remainingWordsAfter.length,
      index,
      bestGuess: bestGuessData
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
                  <div
                    key={index}
                    className="border rounded p-3"
                    style={{ transition: 'background-color 0.2s' }}
                  >
                    <div className="d-flex align-items-center gap-2 mb-2">
                      <Badge bg="secondary" className="me-2">
                        #{index + 1}
                      </Badge>
                      <div className="d-flex gap-1">
                        {guess.word.split('').map((letter, letterIndex) => {
                          const colors = getEvaluationColor(guess.key)
                          return (
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
                          )
                        })}
                      </div>
                      <code className="ms-auto text-muted">{guess.key}</code>
                    </div>

                    <div className="text-muted small">
                      <div className="d-flex gap-3 flex-wrap">
                        <div>
                          📊 <strong>Before:</strong> {remainingBefore} words
                        </div>
                        <div>
                          ✂️ <strong>After:</strong> {remainingAfter.length} words
                        </div>
                      </div>
                      <div className="mt-2 d-flex gap-2 align-items-center">
                        <small 
                          className="text-primary" 
                          style={{ cursor: 'pointer' }}
                          onClick={() => handleGuessCardClick(guess, index)}
                        >
                          🔍 Click for bins
                        </small>
                        <Button
                          variant="outline-primary"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            onGuessClick(index)
                          }}
                          title="Edit guess"
                          className="ms-auto"
                        >
                          <BsPencil size={14} /> Edit
                        </Button>
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
                          <TiTimes size={14} /> Delete
                        </Button>
                      </div>
                    </div>
                  </div>
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
                {isLoadingSuggestions ? (
                  <div className="text-center py-4">
                    <Spinner animation="border" role="status" className="me-2" />
                    <span>Calculating suggestions...</span>
                  </div>
                ) : (
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
                                      {((100 * (word.score || 0)) / currentFilteredList.length).toFixed(1)}%
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </>
                    )}
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
        bestGuess={modalGuessData?.bestGuess?.word}
        bestEvaluation={modalGuessData?.bestGuess?.evaluation}
        bestBinsData={modalGuessData?.bestGuess?.binsData}
        bestGuessInfo={modalGuessData?.bestGuess?.info}
      />
    </div>
  )
}

export default DisplayStatus
