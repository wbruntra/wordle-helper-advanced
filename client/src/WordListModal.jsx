import { useState, useEffect } from 'react'
import Button from 'react-bootstrap/Button'
import Modal from 'react-bootstrap/Modal'
import Form from 'react-bootstrap/Form'
import Spinner from 'react-bootstrap/Spinner'
import { useSelector, useDispatch } from 'react-redux'
import { setShowWord, setSelectedDateIndex } from './redux/gameSlice'

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = Math.round((today - d) / (1000 * 60 * 60 * 24))
  const labels = { 0: 'Today', 1: 'Yesterday', 2: 'Day before yesterday' }
  const label = labels[diff] || d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  return label
}

function WordListModal({ show, handleClose, answerInput, setAnswerInput, todaysWordLoading }) {
  const dispatch = useDispatch()
  const showWord = useSelector((state) => state.game.showWord)
  const selectedDateIndex = useSelector((state) => state.game.selectedDateIndex)
  const recentAnswers = useSelector((state) => state.game.recentAnswers)

  const [customInput, setCustomInput] = useState('')

  useEffect(() => {
    if (show) {
      setCustomInput('')
    }
  }, [show])

  const selectedAnswer = recentAnswers[selectedDateIndex]

  const applyAndClose = () => {
    const trimmedCustom = customInput.toUpperCase().trim()
    if (trimmedCustom.length === 5) {
      setAnswerInput(trimmedCustom)
    } else if (trimmedCustom.length > 0) {
      setAnswerInput('')
    } else if (selectedAnswer) {
      setAnswerInput(selectedAnswer.word)
    } else {
      setAnswerInput('')
    }
    handleClose()
  }

  const effectiveAnswer = selectedAnswer ? selectedAnswer.word : ''

  return (
    <Modal show={show} onHide={applyAndClose}>
      <Modal.Header closeButton>
        <Modal.Title>Settings</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {todaysWordLoading ? (
          <div className="d-flex align-items-center gap-2 mb-3">
            <Spinner animation="border" size="sm" />
            Loading answers...
          </div>
        ) : recentAnswers.length > 0 ? (
          <Form.Group className="mb-3">
            <Form.Label>Answer Date</Form.Label>
            <Form.Select
              value={selectedDateIndex}
              onChange={(e) => dispatch(setSelectedDateIndex(Number(e.target.value)))}
            >
              {recentAnswers.map((answer, idx) => (
                <option key={answer.date} value={idx}>
                  {formatDate(answer.date)}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
        ) : (
          <div className="text-warning mb-3">No historical answers available</div>
        )}

        <Form.Group className="mb-3">
          <Form.Check
            type="switch"
            id="show-word-switch"
            label="Show word"
            checked={showWord}
            onChange={(e) => dispatch(setShowWord(e.target.checked))}
          />
          {showWord && selectedAnswer && (
            <Form.Text className="text-muted mt-1">
              Word: <strong className="font-monospace">{effectiveAnswer}</strong>
            </Form.Text>
          )}
        </Form.Group>

        <hr />

        <Form.Group className="mt-3">
          <Form.Label>
            Custom Answer <small className="text-muted">(overrides date selection)</small>
          </Form.Label>
          <Form.Control
            type="text"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value.toLocaleUpperCase())}
            placeholder="Enter custom answer"
            maxLength={5}
            className="text-uppercase font-monospace"
          />
        </Form.Group>
      </Modal.Body>

      <Modal.Footer>
        <Button onClick={applyAndClose} variant="primary">
          Apply
        </Button>
      </Modal.Footer>
    </Modal>
  )
}

export default WordListModal
