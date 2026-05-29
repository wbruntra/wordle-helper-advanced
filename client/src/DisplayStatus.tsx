import { orderEntireWordList } from './utils'
import {
  applyGuesses,
  filterWordsUsingGuessResult,
  getBins,
  evaluateToString,
} from './advancedUtils'
import { memo, useEffect, useMemo, useState } from 'react'
import _ from 'lodash'
import { BsPencil } from 'react-icons/bs'
import { TiTimes } from 'react-icons/ti'
import { useSelector, useDispatch } from 'react-redux'
import { removeGuess } from './redux/gameSlice'
import { Badge, Button, Container } from 'react-bootstrap'

import BinsTable from './BinsTable'
import BinDetailsModal from './BinDetailsModal'
import { trpc } from './trpc'
import type { RootState } from './redux/store'

interface DisplayStatusProps {
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

function getSolveStage(remainingCount: number) {
  if (remainingCount <= 1) {
    return {
      title: 'Solved',
    }
  }

  if (remainingCount <= 10) {
    return {
      title: 'Endgame',
    }
  }

  if (remainingCount <= 75) {
    return {
      title: 'Narrowing',
    }
  }

  if (remainingCount <= 300) {
    return {
      title: 'Midgame',
    }
  }

  return {
    title: 'Wide open',
  }
}

function DisplayStatus({ startingList, onGuessClick, answer }: DisplayStatusProps) {
  const dispatch = useDispatch()
  const currentGuesses = useSelector((state: RootState) => state.game.guesses)
  const [showDepth, setShowDepth] = useState(false)
  const [currentFilteredList, setFiltered] = useState<string[]>(startingList.slice())
  const [error, setError] = useState('')
  const [bins, setBins] = useState<BinObject[]>([])
  const [binsWord, setBinsWord] = useState('')
  const [showBinModal, setShowBinModal] = useState(false)
  const [modalGuessData, setModalGuessData] = useState<ModalGuessData | null>(null)

  const trpcUtils = trpc.useUtils()
  const remainingCount = currentFilteredList.length
  const solveStage = getSolveStage(remainingCount)
  const latestGuess = currentGuesses[currentGuesses.length - 1] ?? null

  const guessRemainingCounts = useMemo(() => {
    return currentGuesses.map((_, index) => {
      const remainingAfter = applyGuesses(startingList, currentGuesses.slice(0, index + 1))
      const remainingBefore =
        index === 0
          ? startingList.length
          : applyGuesses(startingList, currentGuesses.slice(0, index)).length
      return { remainingAfter: remainingAfter.length, remainingBefore }
    })
  }, [currentGuesses, startingList])

  useEffect(() => {
    const localFiltered = applyGuesses(startingList, currentGuesses)
    setFiltered(localFiltered)

    if (localFiltered.length === 0) {
      setError('Something went wrong. Maybe you put in the wrong evaluation?')
    } else {
      setError('')
    }
  }, [currentGuesses, startingList])

  useEffect(() => {
    if (currentGuesses.length > 0 && showDepth) {
      const wordToAnalyze = currentGuesses[currentGuesses.length - 1].word
      let localFiltered = startingList.slice()
      for (const guess of currentGuesses) {
        if (guess.word === wordToAnalyze) {
          break
        }
        localFiltered = filterWordsUsingGuessResult(guess, localFiltered)
      }

      let newBins: any = getBins(wordToAnalyze, localFiltered, {
        returnObject: true,
        showMatches: true,
      })
      newBins = _.map(newBins, (value, key) => ({ [key]: value }))
      newBins = _.sortBy(newBins, (value: any) => (Object.values(value)[0] as any).length)
      setBinsWord(`${wordToAnalyze} (sorting ${localFiltered.length} words)`)
      setBins(newBins)
    }
  }, [currentGuesses, showDepth, startingList])

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

  const renderGuessTiles = (word: string, key: string, size: 'sm' | 'md' = 'md') => {
    const colors = getEvaluationColor(key)
    const dimension = size === 'sm' ? '32px' : '38px'
    const fontSize = size === 'sm' ? '0.9rem' : '1rem'

    return (
      <div className="guess-tile-row">
        {word.split('').map((letter, letterIndex) => (
          <div
            key={`${word}-${letterIndex}`}
            className="guess-tile"
            style={{
              width: dimension,
              height: dimension,
              fontSize,
              backgroundColor: getColorForEvaluation(colors[letterIndex]),
            }}
          >
            {letter}
          </div>
        ))}
      </div>
    )
  }

  const handleGuessCardClick = async (guess: any, index: number) => {
    // Get all previous guesses (excluding current one)
    const previousGuesses = currentGuesses
      .filter((_g, i) => i < index)
      .map((g) => ({
        word: g.word,
        key: g.key,
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
      showMatches: true,
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
          history: previousGuesses.map((g) => ({
            guess: g.word,
            evaluation: g.key,
          })),
          guessNumber: index + 1,
        })

        if (result && result.bestGuess && !result.error) {
          const bestGuess = result.bestGuess

          // Calculate bins for the best guess
          const bestBinsData = getBins(bestGuess, remainingWordsBefore, {
            returnObject: true,
            showMatches: true,
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
              avgBinSize: result.bins
                ? parseFloat((result.remainingCount / result.bins).toFixed(2))
                : null,
              distributionScore: null,
            },
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
      bestGuess: bestGuessData,
    })
    setShowBinModal(true)
  }

  return (
    <div>
      <Container className="mt-4 mb-5 wordle-status-shell">
        {currentGuesses.length > 0 ? (
          <div className="solver-stack">
            <section className="solver-panel solver-panel-highlight">
              <div className="solver-panel-header">
                <div>
                  <p className="solver-panel-eyebrow mb-1">Next step</p>
                  <h4 className="mb-1">{solveStage.title}</h4>
                </div>
              </div>

              {latestGuess && (
                <div className="solver-latest-row">
                  <div>
                    <p className="solver-stat-label mb-1">Latest guess</p>
                    <div className="d-flex align-items-center gap-2 flex-wrap">
                      {renderGuessTiles(latestGuess.word, latestGuess.key, 'sm')}
                      <code className="solver-inline-code">{latestGuess.key}</code>
                    </div>
                  </div>

                  <div className="solver-count-chip">
                    <span className="solver-stat-label">Words left</span>
                    <strong>{remainingCount.toLocaleString()}</strong>
                  </div>
                </div>
              )}
            </section>

            <section className="solver-panel">
              <div className="solver-panel-header">
                <div>
                  <p className="solver-panel-eyebrow mb-1">History</p>
                  <h5 className="mb-1">Guess history</h5>
                </div>
              </div>

              <div className="guess-history-list">
                {[...currentGuesses].reverse().map((guess, reversedIndex) => {
                  const index = currentGuesses.length - 1 - reversedIndex
                  const { remainingAfter, remainingBefore } = guessRemainingCounts[index]
                  const isLatest = index === currentGuesses.length - 1

                  return (
                    <article
                      key={index}
                      className={`guess-history-card ${isLatest ? 'is-latest' : ''}`}
                    >
                      <div className="guess-history-main">
                        <div className="guess-history-heading">
                          <Badge bg={isLatest ? 'primary' : 'secondary'}>#{index + 1}</Badge>
                          {isLatest && <span className="guess-history-latest">Latest</span>}
                        </div>

                        <div className="guess-history-tiles-wrap">
                          {renderGuessTiles(guess.word, guess.key)}
                        </div>

                        <div className="guess-history-stats">
                          <span className="guess-history-stat-label">Remaining</span>
                          <strong>
                            {remainingBefore.toLocaleString()} → {remainingAfter.toLocaleString()}
                          </strong>
                        </div>
                      </div>

                      <div className="guess-history-actions">
                        <Button
                          variant="link"
                          className="guess-link-button"
                          onClick={() => handleGuessCardClick(guess, index)}
                        >
                          View breakdown
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
                          <BsPencil size={14} /> Edit
                        </Button>
                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            setError('')
                            dispatch(removeGuess(index))
                          }}
                          title="Delete guess"
                        >
                          <TiTimes size={14} /> Delete
                        </Button>
                      </div>
                    </article>
                  )
                })}
              </div>
            </section>

            <section className="solver-panel">
              <div className="solver-panel-header">
                <div>
                  <p className="solver-panel-eyebrow mb-1">Advanced</p>
                  <h5 className="mb-1">Pattern analysis</h5>
                </div>
                {latestGuess && (
                  <Button
                    variant="outline-light"
                    size="sm"
                    onClick={() => {
                      if (showDepth) {
                        setShowDepth(false)
                        return
                      }

                      setShowDepth(true)
                      createBinsForGuess(latestGuess.word)
                    }}
                  >
                    {showDepth ? 'Hide analysis' : `Analyze ${latestGuess.word}`}
                  </Button>
                )}
              </div>

              {showDepth && (
                <div className="solver-analysis-wrap mt-3">
                  <h2 className="h5 mb-3">{binsWord}</h2>
                  <BinsTable bins={bins} />
                </div>
              )}
            </section>
          </div>
        ) : (
          <section className="solver-panel solver-empty-panel text-center">
            <p className="solver-panel-eyebrow mb-2">Ready when you are</p>
            <h5 className="mb-2">Start with your first guess</h5>
          </section>
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

export default memo(DisplayStatus)
