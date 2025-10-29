import { useEffect, useRef, useState } from 'react'
import { FiSettings } from 'react-icons/fi'
import { MdOutlineScreenshot } from 'react-icons/md'
import { AiOutlineBarChart } from 'react-icons/ai'
import { GiRobotGrab } from 'react-icons/gi'
import { useSelector, useDispatch } from 'react-redux'
import { setModalState } from './redux/uiSlice'
import { addGuess, updateGuess, setGuesses } from './redux/gameSlice'
import { useNavigate } from 'react-router-dom'

import { evaluateToString } from './advancedUtils'
// import { commonPlusOfficial, nytAll, nytSolutions } from './wordlists/index'
import likelyWordList from './wordlists/likely-word-list.json'

import DisplayStatus from './DisplayStatus'
import Guess from './Guess'
import WordListModal from './WordListModal'
import GameAnalysisModal from './GameAnalysisModal'
import _ from 'lodash'
import examples from './examples.json'
import UploadScreenShotModal from './UploadScreenShotModal'

const wordLists = {
  // nytSolutions,
  // commonPlusOfficial,
  // nytAll,
  likely: likelyWordList,
}

// Set example once at module level since it never changes
const example = _.sample(examples)

function Wordle() {
  const [word, setWord] = useState('')
  const [key, setKey] = useState('')
  const [wordListName, setWordListName] = useState('likely')
  const [currentFilteredList, setFiltered] = useState(wordLists[wordListName].slice())
  const inputEl = useRef(null)
  const [showExample, setShowExample] = useState(true)
  const [error, setError] = useState('')
  const [answerInput, setAnswerInput] = useState('')
  const [editingGuessIndex, setEditingGuessIndex] = useState(null)
  const [editWord, setEditWord] = useState('')
  const [editKey, setEditKey] = useState('')

  const dispatch = useDispatch()
  const navigate = useNavigate()
  const modals = useSelector(state => state.ui.modals)
  const guesses = useSelector(state => state.game.guesses)

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
    setShowExample(false)
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
      <div className="container mt-3">
        <div className="d-flex justify-content-end">
          <div>
            <span className="selectable me-2" onClick={() => navigate('/auto-play')} title="Auto-Play">
              <GiRobotGrab size={'2em'} />
            </span>
            <span className="selectable me-2" onClick={() => dispatch(setModalState({ modalName: 'upload', isOpen: true }))}>
              <MdOutlineScreenshot size={'2em'} />
            </span>
            <span className="selectable me-2" onClick={() => dispatch(setModalState({ modalName: 'analysis', isOpen: true }))}>
              <AiOutlineBarChart size={'2em'} />
            </span>
            <span className="selectable" onClick={() => dispatch(setModalState({ modalName: 'wordList', isOpen: true }))}>
              <FiSettings size={'2em'} />
            </span>
          </div>
        </div>
      </div>
      <div className="container text-center">
        <h1>Wordle Helper</h1>
        {!guesses.length > 0 && (
          <>
            <p>Enter your guesses along with the color-coded response you got from Wordle</p>
            <p className="text-left">
              Y → yellow <br />
              G → green <br />
              Any other character for a miss
            </p>
            <p className="example">
              Example: {example.word}{' '}
              <span style={{ fontSize: '1.8em' }} className="arrow">
                →
              </span>{' '}
              {example.key}
            </p>
            <div className="mb-4">
              {word.length < 5 && (
                <div
                  onClick={() => {
                    setShowExample(true)
                  }}
                  className="guess selectable"
                >
                  <Guess guess={{ word: example.word, key: example.key }} />
                </div>
              )}
            </div>
          </>
        )}

        {/* New Guess Input */}
        {editingGuessIndex === null && (
          <div className="row justify-content-center">
            <form className="mb-3 col-8 col-md-3" onSubmit={handleAddGuess}>
              <fieldset className="mb-2">
                <input
                  className="font-mono form-control"
                  ref={inputEl}
                  value={word}
                  onChange={(e) => {
                    setWord(e.target.value.toUpperCase())
                    if (e.target.value.toUpperCase().length === 5 && answerInput.length === 5) {
                      const newKey = evaluateToString(e.target.value.toUpperCase(), answerInput)
                      setKey(newKey)
                    }
                  }}
                  placeholder={showExample ? example.word : 'GUESS'}
                />
              </fieldset>
              <fieldset className="mb-3">
                <input
                  className="font-mono form-control"
                  value={key}
                  onChange={(e) => setKey(e.target.value.toUpperCase())}
                  placeholder={showExample ? example.key : `response`}
                />
              </fieldset>
              <input
                className="btn btn-primary"
                type="submit"
                value="Add Guess"
                disabled={
                  !(word.length === key.length && word.length === currentFilteredList[0].length)
                }
              />
            </form>
          </div>
        )}

        {/* Edit Guess Form */}
        {editingGuessIndex !== null && (
          <div className="row justify-content-center">
            <form className="mb-3 col-8 col-md-3" onSubmit={saveEditedGuess}>
              <fieldset className="mb-2">
                <input
                  className="font-mono form-control"
                  value={editWord}
                  onChange={(e) => setEditWord(e.target.value.toUpperCase())}
                  placeholder="GUESS"
                />
              </fieldset>
              <fieldset className="mb-3">
                <input
                  className="font-mono form-control"
                  value={editKey}
                  onChange={(e) => setEditKey(e.target.value.toUpperCase())}
                  placeholder="response"
                />
              </fieldset>
              <div className="d-flex justify-content-between">
                <button className="btn btn-primary" type="submit">
                  Save
                </button>
                <button className="btn btn-secondary" type="button" onClick={cancelEditing}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {error !== '' && (
          <div>
            <p className="error">{error}</p>
          </div>
        )}

        <DisplayStatus
          guesses={guesses}
          startingList={currentFilteredList}
          onGuessClick={startEditingGuess}
        />
      </div>
      <WordListModal
        wordList={wordListName}
        setWordList={setWordListName}
        show={modals.wordList}
        handleClose={() => {
          dispatch(setModalState({ modalName: 'wordList', isOpen: false }))
        }}
        answerInput={answerInput}
        setAnswerInput={setAnswerInput}
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
