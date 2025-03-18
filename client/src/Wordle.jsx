import { useEffect, useRef, useState } from 'react'
import { FiSettings } from 'react-icons/fi'
import { MdOutlineScreenshot } from 'react-icons/md'

import { evaluateToString } from './utils'
import { commonPlusOfficial, nytAll, nytSolutions } from './wordlists/index'
import { getCanonical, getCanonicalKey } from './utils'
import DisplayStatus from './DisplayStatus'
import Guess from './Guess'
import WordListModal from './WordListModal'
import _ from 'lodash'
import examples from './examples.json'
import UploadScreenShotModal from './UploadScreenShotModal'

const wordLists = {
  nytSolutions,
  commonPlusOfficial,
  nytAll,
}

function Wordle() {
  const [touched, setTouched] = useState(false)
  const [guesses, setGuesses] = useState([])
  const [word, setWord] = useState('')
  const [key, setKey] = useState('')
  const [wordListName, setWordListName] = useState('nytAll')
  const [currentFilteredList, setFiltered] = useState(wordLists[wordListName].slice())
  const inputEl = useRef(null)
  const [bins, setBins] = useState([])
  const [example, setExample] = useState(_.sample(examples))
  const [showExample, setShowExample] = useState(true)
  const [error, setError] = useState('')
  const [countOnly, setCountOnly] = useState(true)
  const [showGuessInput, setShowGuessInput] = useState(true)
  const [showWordListModal, setShowWordListModal] = useState(false)
  const [answerInput, setAnswerInput] = useState('')
  const [editingGuessIndex, setEditingGuessIndex] = useState(null)
  const [editWord, setEditWord] = useState('')
  const [editKey, setEditKey] = useState('')

  const [showUploadModal, setShowUploadModal] = useState(false)

  const params = new URLSearchParams(window.location.search)

  useEffect(() => {
    let newFilteredList = wordLists[wordListName].slice()
    setFiltered(newFilteredList)
  }, [wordListName, guesses])

  const resetGuesses = () => {
    setGuesses([])
    setTouched(false)
  }

  const addGuess = (e) => {
    e.preventDefault()
    if (!(word.length === 5 && key.length === 5)) {
      setError('Invalid Input')
      return
    }
    setError('')
    setShowExample(false)
    const newGuesses = [
      ...guesses,
      {
        word: getCanonical(word),
        key: getCanonicalKey(key),
      },
    ]
    setGuesses(newGuesses)
    setWord('')
    setKey('')
    setTouched(true)
    document.activeElement.blur()
    inputEl.current.focus()
  }

  const removeGuess = (index) => {
    const newGuesses = [...guesses]
    newGuesses.splice(index, 1)
    setGuesses(newGuesses)
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
    const newGuesses = [...guesses]
    newGuesses[editingGuessIndex] = {
      word: getCanonical(editWord),
      key: getCanonicalKey(editKey),
    }
    setGuesses(newGuesses)
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
    <div data-bs-theme="dark">
      <div className="container mt-3">
        <div className="d-flex justify-content-end">
          <div>
            <span className="selectable me-2" onClick={() => setShowUploadModal(true)}>
              <MdOutlineScreenshot size={'2em'} />
            </span>
            <span className="selectable" onClick={() => setShowWordListModal(true)}>
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
            <form className="mb-3 col-8 col-md-3" onSubmit={addGuess}>
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
          setGuesses={setGuesses}
          resetGuesses={resetGuesses}
          startingList={currentFilteredList}
          removeGuess={removeGuess}
          onGuessClick={startEditingGuess}
        />
      </div>
      <WordListModal
        wordList={wordListName}
        setWordList={setWordListName}
        show={showWordListModal}
        handleClose={() => {
          setShowWordListModal(false)
        }}
        answerInput={answerInput}
        setAnswerInput={setAnswerInput}
      />

      <UploadScreenShotModal
        show={showUploadModal}
        handleClose={() => {
          setShowUploadModal(false)
        }}
        setGuesses={setGuesses}
      />
    </div>
  )
}

export default Wordle
