import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FiSettings } from 'react-icons/fi'
import { MdOutlineScreenshot } from 'react-icons/md'
import { AiOutlineBarChart } from 'react-icons/ai'
import { FaRobot } from 'react-icons/fa6'
import { useSelector, useDispatch } from 'react-redux'
import { setModalState } from './redux/uiSlice'
import {
  addGuess,
  updateGuess,
  setGuesses,
  setRecentAnswers,
} from './redux/gameSlice'
import { useNavigate } from 'react-router-dom'
import { Container, Card, Form, Button, Alert, Row, Col } from 'react-bootstrap'
import { trpc } from './trpc'

import { applyGuesses, evaluateToString } from './advancedUtils'
// import { commonPlusOfficial, nytAll, nytSolutions } from './wordlists/index'
import likelyWordList from './wordlists/likely-word-list.json'

import DisplayStatus from './DisplayStatus'
import WordListModal from './WordListModal'
import GameAnalysisModal from './GameAnalysisModal'
import RemainingWordsModal from './RemainingWordsModal'
import UploadScreenShotModal from './UploadScreenShotModal'
import InteractiveGuessInput from './InteractiveGuessInput'

const wordLists = {
  // nytSolutions,
  // commonPlusOfficial,
  // nytAll,
  likely: likelyWordList,
}

function getSolvePhase(remainingCount) {
  if (remainingCount <= 1) {
    return {
      label: 'Solved',
    }
  }

  if (remainingCount <= 10) {
    return {
      label: 'Endgame',
    }
  }

  if (remainingCount <= 75) {
    return {
      label: 'Narrowing',
    }
  }

  if (remainingCount <= 300) {
    return {
      label: 'Midgame',
    }
  }

  return {
    label: 'Wide Open',
  }
}

function Wordle() {
  const [word, setWord] = useState('')
  const [key, setKey] = useState('')
  const [wordListName, setWordListName] = useState('likely')
  const inputEl = useRef(null)
  const [error, setError] = useState('')
  const [answerInput, setAnswerInput] = useState('')
  const [editingGuessIndex, setEditingGuessIndex] = useState(null)
  const [editWord, setEditWord] = useState('')
  const [editKey, setEditKey] = useState('')
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const [showRemainingModal, setShowRemainingModal] = useState(false)
  const [countAnimKey, setCountAnimKey] = useState(0)

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const dispatch = useDispatch()
  const navigate = useNavigate()
  const modals = useSelector((state) => state.ui.modals)
  const guesses = useSelector((state) => state.game.guesses)
  const recentAnswers = useSelector((state) => state.game.recentAnswers)
  const selectedDateIndex = useSelector((state) => state.game.selectedDateIndex)
  const startingWordList = wordLists[wordListName]
  const wordLength = startingWordList[0]?.length ?? 5

  const remainingWords = useMemo(
    () => applyGuesses(startingWordList, guesses),
    [startingWordList, guesses],
  )

  const solvePhase = useMemo(
    () => getSolvePhase(remainingWords.length),
    [remainingWords.length],
  )

  useEffect(() => {
    setCountAnimKey((k) => k + 1)
  }, [remainingWords.length])

  // Fetch recent answers from the backend
  const recentAnswersQuery = trpc.getRecentAnswers.useQuery({ limit: 3 })

  // Store recent answers in Redux and set initial answerInput
  useEffect(() => {
    if (
      recentAnswersQuery.data &&
      recentAnswersQuery.data.answers &&
      recentAnswersQuery.data.answers.length > 0
    ) {
      dispatch(setRecentAnswers(recentAnswersQuery.data.answers))
      if (!answerInput) {
        setAnswerInput(recentAnswersQuery.data.answers[0].word)
      }
    }
  }, [recentAnswersQuery.data, dispatch, answerInput])

  const handleAddGuess = (e) => {
    e.preventDefault()
    if (!(word.length === 5 && key.length === 5)) {
      setError('Invalid Input')
      return
    }
    setError('')
    dispatch(addGuess({ word, key }))
    setWord('')
    setKey('')
    document.activeElement.blur()
    inputEl.current.focus()
  }

  const startEditingGuess = useCallback((index) => {
    setEditingGuessIndex(index)
    setEditWord(guesses[index].word)
    setEditKey(guesses[index].key)
  }, [guesses])

  const saveEditedGuess = (e) => {
    e.preventDefault()
    if (!(editWord.length === 5 && editKey.length === 5)) {
      setError('Invalid Input')
      return
    }
    dispatch(updateGuess({ index: editingGuessIndex, word: editWord, key: editKey }))
    setEditingGuessIndex(null)
    setEditWord('')
    setEditKey('')
    setError('')
  }

  const cancelEditing = () => {
    setEditingGuessIndex(null)
    setEditWord('')
    setEditKey('')
    setError('')
  }

  const hideRemainingModal = useCallback(() => {
    setShowRemainingModal(false)
  }, [])

  return (
    <div className="wordle-page">
      <Container className="mt-3 wordle-home-shell">
        <div className="wordle-home-header">
          <div className="flex-shrink-1">
            <div className="wordle-title-wrap">
              <h3 className="mb-1">Wordle Helper</h3>
              {recentAnswers.length > 0 && selectedDateIndex < recentAnswers.length && (
                <small className="wordle-date-label">
                  {new Date(recentAnswers[selectedDateIndex].date + 'T00:00:00').toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </small>
              )}
            </div>
          </div>

          <div className="wordle-toolbar flex-shrink-0">
              {guesses.length > 0 && (
                <Button
                  variant="outline-light"
                  size="sm"
                  className="wordle-toolbar-clear"
                  onClick={() => dispatch(setGuesses([]))}
                >
                  Clear all
                </Button>
              )}
              <span
                className="selectable wordle-toolbar-button"
                onClick={() => navigate('/auto-play')}
                title="Auto-Play"
              >
                <FaRobot size={'2em'} />
              </span>
              <span
                className="selectable wordle-toolbar-button"
                onClick={() => dispatch(setModalState({ modalName: 'upload', isOpen: true }))}
                title="Import screenshot"
              >
                <MdOutlineScreenshot size={'2em'} />
              </span>
              <span
                className="selectable wordle-toolbar-button"
                onClick={() => dispatch(setModalState({ modalName: 'analysis', isOpen: true }))}
                title="Game analysis"
              >
                <AiOutlineBarChart size={'2em'} />
              </span>
              <span
                className="selectable wordle-toolbar-button"
                onClick={() => dispatch(setModalState({ modalName: 'wordList', isOpen: true }))}
                title="Settings and word list"
              >
                <FiSettings size={'2em'} />
              </span>
          </div>
        </div>

        <Row className="g-2 align-items-stretch mb-3">
          <Col lg={5}>
            <Card
              className="wordle-hero-card border-0 h-100"
              onClick={() => setShowRemainingModal(true)}
              title="View remaining words"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  setShowRemainingModal(true)
                }
              }}
            >
              <Card.Body>
                <div className="wordle-hero-topline">
                  <div>
                    <div key={countAnimKey} className="wordle-hero-count wordle-hero-count-anim">
                      {remainingWords.length.toLocaleString()}
                    </div>
                    <div className="wordle-hero-label">words remaining</div>
                  </div>
                  <span className="wordle-phase-pill">{solvePhase.label}</span>
                </div>
              </Card.Body>
            </Card>
          </Col>

          <Col lg={7}>
            <Card className="wordle-entry-card border-0 h-100">
              <Card.Body>
                {editingGuessIndex === null && (
                  <Form onSubmit={handleAddGuess}>
                    <Form.Group className="wordle-guess-field">
                      <Form.Control
                        className="font-mono text-uppercase wordle-guess-input"
                        value={word}
                        onChange={(e) => {
                          const upperWord = e.target.value.toUpperCase()
                          setWord(upperWord)
                          if (upperWord.length === 5 && answerInput.length === 5) {
                            const newKey = evaluateToString(upperWord, answerInput)
                            setKey(newKey)
                          }
                        }}
                        placeholder="CRANE"
                        maxLength="5"
                        ref={inputEl}
                      />
                    </Form.Group>

                    {isMobile ? (
                      <div className="wordle-feedback-panel">
                        <InteractiveGuessInput word={word} currentKey={key} onKeyChange={setKey} />
                      </div>
                    ) : (
                      <Form.Group className="wordle-guess-field">
                        <Form.Control
                          className="font-mono text-uppercase wordle-guess-input"
                          value={key}
                          onChange={(e) => setKey(e.target.value.toUpperCase())}
                          placeholder="GY---"
                          maxLength="5"
                        />
                      </Form.Group>
                    )}

                    {error !== '' && <Alert variant="danger">{error}</Alert>}

                    <Button
                      variant="primary"
                      type="submit"
                      className="w-100 wordle-primary-action"
                      disabled={word.length !== wordLength || key.length !== wordLength}
                    >
                      Add
                    </Button>
                  </Form>
                )}

                {editingGuessIndex !== null && (
                  <Form onSubmit={saveEditedGuess}>
                    <Form.Group className="wordle-guess-field">
                      <Form.Control
                        className="font-mono text-uppercase wordle-guess-input"
                        value={editWord}
                        onChange={(e) => setEditWord(e.target.value.toUpperCase())}
                        placeholder="GUESS"
                        maxLength="5"
                      />
                    </Form.Group>

                    {isMobile ? (
                      <div className="wordle-feedback-panel">
                        <InteractiveGuessInput
                          word={editWord}
                          currentKey={editKey}
                          onKeyChange={setEditKey}
                        />
                      </div>
                    ) : (
                      <Form.Group className="wordle-guess-field">
                        <Form.Control
                          className="font-mono text-uppercase wordle-guess-input"
                          value={editKey}
                          onChange={(e) => setEditKey(e.target.value.toUpperCase())}
                          placeholder="GY---"
                          maxLength="5"
                        />
                      </Form.Group>
                    )}

                    {error !== '' && <Alert variant="danger">{error}</Alert>}

                    <div className="d-flex gap-2">
                      <Button variant="primary" type="submit" className="flex-grow-1 wordle-primary-action">
                        Save
                      </Button>
                      <Button variant="secondary" type="button" className="flex-grow-1" onClick={cancelEditing}>
                        Cancel
                      </Button>
                    </div>
                  </Form>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>

      <DisplayStatus
        startingList={startingWordList}
        onGuessClick={startEditingGuess}
        answer={answerInput}
      />

      <WordListModal
        wordList={wordListName}
        setWordList={setWordListName}
        show={modals.wordList}
        handleClose={() => {
          dispatch(setModalState({ modalName: 'wordList', isOpen: false }))
        }}
        answerInput={answerInput}
        setAnswerInput={setAnswerInput}
        todaysWordLoading={recentAnswersQuery.isLoading}
      />

      <UploadScreenShotModal
        show={modals.upload}
        handleClose={() => {
          dispatch(setModalState({ modalName: 'upload', isOpen: false }))
        }}
        setGuesses={(newGuesses) => dispatch(setGuesses(newGuesses))}
      />

      <GameAnalysisModal
        show={modals.analysis}
        handleClose={() => {
          dispatch(setModalState({ modalName: 'analysis', isOpen: false }))
        }}
        guesses={guesses}
        wordList={startingWordList}
        answer={answerInput}
      />

      <RemainingWordsModal
        show={showRemainingModal}
        onHide={hideRemainingModal}
        remainingWords={remainingWords}
        startingList={startingWordList}
      />
    </div>
  )
}

export default Wordle
