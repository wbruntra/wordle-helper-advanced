import { useEffect, useRef, useState } from 'react'
import { FiSettings } from 'react-icons/fi'
import { MdOutlineScreenshot } from 'react-icons/md'
import { AiOutlineBarChart } from 'react-icons/ai'
import { FaRobot } from 'react-icons/fa6'
import { useSelector, useDispatch } from 'react-redux'
import { setModalState } from './redux/uiSlice'
import { addGuess, updateGuess, setGuesses, setTodaysWord } from './redux/gameSlice'
import { useNavigate } from 'react-router-dom'
import { Container, Card, Form, Button, Alert, Row, Col } from 'react-bootstrap'
import { trpc } from './trpc'

import { evaluateToString } from './advancedUtils'
// import { commonPlusOfficial, nytAll, nytSolutions } from './wordlists/index'
import likelyWordList from './wordlists/likely-word-list.json'

import DisplayStatus from './DisplayStatus'
import WordListModal from './WordListModal'
import GameAnalysisModal from './GameAnalysisModal'
import _ from 'lodash'
import UploadScreenShotModal from './UploadScreenShotModal'

const wordLists = {
  // nytSolutions,
  // commonPlusOfficial,
  // nytAll,
  likely: likelyWordList,
}

function Wordle() {
  const [word, setWord] = useState('')
  const [key, setKey] = useState('')
  const [wordListName, setWordListName] = useState('likely')
  const [currentFilteredList, setFiltered] = useState(wordLists[wordListName].slice())
  const inputEl = useRef(null)
  const [error, setError] = useState('')
  const [answerInput, setAnswerInput] = useState('')
  const [editingGuessIndex, setEditingGuessIndex] = useState(null)
  const [editWord, setEditWord] = useState('')
  const [editKey, setEditKey] = useState('')

  const dispatch = useDispatch()
  const navigate = useNavigate()
  const modals = useSelector((state) => state.ui.modals)
  const guesses = useSelector((state) => state.game.guesses)
  const useTodaysWord = useSelector((state) => state.game.useTodaysWord)
  const todaysWord = useSelector((state) => state.game.todaysWord)

  // Fetch today's word from the backend
  const recentAnswersQuery = trpc.getRecentAnswers.useQuery({ limit: 1 })

  // Update todaysWord in Redux when query data changes
  useEffect(() => {
    if (recentAnswersQuery.data && recentAnswersQuery.data.answers && recentAnswersQuery.data.answers.length > 0) {
      const latestWord = recentAnswersQuery.data.answers[0].word
      dispatch(setTodaysWord(latestWord))
      // If useTodaysWord is enabled and answerInput is empty, set it
      if (useTodaysWord && !answerInput) {
        setAnswerInput(latestWord)
      }
    }
  }, [recentAnswersQuery.data, dispatch])

  // When useTodaysWord changes, update answerInput accordingly
  useEffect(() => {
    if (useTodaysWord && todaysWord) {
      setAnswerInput(todaysWord)
    }
  }, [useTodaysWord, todaysWord])

  useEffect(() => {
    let newFilteredList = wordLists[wordListName].slice()
    setFiltered(newFilteredList)
  }, [wordListName, guesses])

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

  const startEditingGuess = (index) => {
    setEditingGuessIndex(index)
    setEditWord(guesses[index].word)
    setEditKey(guesses[index].key)
  }

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

  return (
    <div>
      <Container className="mt-3">
        <div className="d-flex justify-content-between align-items-center flex-nowrap">
          <h3 className="mb-4 flex-shrink-1">Wordle Helper</h3>

          <div className="d-flex justify-content-end mb-4 flex-shrink-0">
            <div className="d-flex flex-nowrap">
              <span
                className="selectable me-3"
                onClick={() => navigate('/auto-play')}
                title="Auto-Play"
              >
                <FaRobot size={'2em'} />
              </span>
              <span
                className="selectable me-3"
                onClick={() => dispatch(setModalState({ modalName: 'upload', isOpen: true }))}
              >
                <MdOutlineScreenshot size={'2em'} />
              </span>
              <span
                className="selectable me-3"
                onClick={() => dispatch(setModalState({ modalName: 'analysis', isOpen: true }))}
              >
                <AiOutlineBarChart size={'2em'} />
              </span>
              <span
                className="selectable"
                onClick={() => dispatch(setModalState({ modalName: 'wordList', isOpen: true }))}
              >
                <FiSettings size={'2em'} />
              </span>
            </div>
          </div>
        </div>
      </Container>

      <Container className="text-center">
        <Row className="mb-4 justify-content-center">
          <Col lg={6}>
            <Card>
              <Card.Body>
                <Card.Title>
                  {editingGuessIndex === null ? 'Add New Guess' : 'Edit Guess'}
                </Card.Title>

                {editingGuessIndex === null && (
                  <Form onSubmit={handleAddGuess}>
                    <Form.Group className="mb-3">
                      {/* <Form.Label>Your Guess</Form.Label> */}
                      <Form.Control
                        className="font-mono text-uppercase"
                        value={word}
                        onChange={(e) => {
                          setWord(e.target.value.toUpperCase())
                          if (
                            e.target.value.toUpperCase().length === 5 &&
                            answerInput.length === 5
                          ) {
                            const newKey = evaluateToString(
                              e.target.value.toUpperCase(),
                              answerInput,
                            )
                            setKey(newKey)
                          }
                        }}
                        placeholder="GUESS"
                        maxLength="5"
                        ref={inputEl}
                      />
                    </Form.Group>

                    <Form.Group className="mb-3">
                      {/* <Form.Label>Response</Form.Label> */}
                      <Form.Control
                        className="font-mono text-uppercase"
                        value={key}
                        onChange={(e) => setKey(e.target.value.toUpperCase())}
                        placeholder="response"
                        maxLength="5"
                      />
                      <Form.Text className="text-muted">
                        Y = yellow, G = green, other = miss
                      </Form.Text>
                    </Form.Group>

                    {error !== '' && <Alert variant="danger">{error}</Alert>}

                    <Button
                      variant="primary"
                      type="submit"
                      className="w-100"
                      disabled={
                        !(
                          word.length === key.length &&
                          word.length === currentFilteredList[0].length
                        )
                      }
                    >
                      Add Guess
                    </Button>
                  </Form>
                )}

                {editingGuessIndex !== null && (
                  <Form onSubmit={saveEditedGuess}>
                    <Form.Group className="mb-3">
                      <Form.Label>Guess</Form.Label>
                      <Form.Control
                        className="font-mono text-uppercase"
                        value={editWord}
                        onChange={(e) => setEditWord(e.target.value.toUpperCase())}
                        placeholder="GUESS"
                        maxLength="5"
                      />
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Label>Response</Form.Label>
                      <Form.Control
                        className="font-mono text-uppercase"
                        value={editKey}
                        onChange={(e) => setEditKey(e.target.value.toUpperCase())}
                        placeholder="response"
                        maxLength="5"
                      />
                    </Form.Group>

                    {error !== '' && <Alert variant="danger">{error}</Alert>}

                    <div className="d-flex gap-2">
                      <Button variant="primary" type="submit" className="flex-grow-1">
                        Save
                      </Button>
                      <Button
                        variant="secondary"
                        type="button"
                        className="flex-grow-1"
                        onClick={cancelEditing}
                      >
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
        guesses={guesses}
        startingList={currentFilteredList}
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
        wordList={currentFilteredList}
        answer={answerInput}
      />
    </div>
  )
}

export default Wordle
