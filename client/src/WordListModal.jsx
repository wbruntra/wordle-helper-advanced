import Button from 'react-bootstrap/Button'
import Modal from 'react-bootstrap/Modal'
import Form from 'react-bootstrap/Form'
import Spinner from 'react-bootstrap/Spinner'
import { useSelector, useDispatch } from 'react-redux'
import { setUseTodaysWord } from './redux/gameSlice'

function WordListModal({ show, handleClose, answerInput, setAnswerInput, todaysWordLoading }) {
  const dispatch = useDispatch()
  const useTodaysWord = useSelector((state) => state.game.useTodaysWord)
  const todaysWord = useSelector((state) => state.game.todaysWord)

  return (
    <Modal show={show} onHide={handleClose}>
      <Modal.Header closeButton>
        <Modal.Title>Settings</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <Form.Group className="mb-4">
          <Form.Check
            type="switch"
            id="use-todays-word-switch"
            label="Use today's Wordle answer"
            checked={useTodaysWord}
            onChange={(e) => {
              dispatch(setUseTodaysWord(e.target.checked))
              if (e.target.checked && todaysWord) {
                setAnswerInput(todaysWord)
              } else if (!e.target.checked) {
                setAnswerInput('')
              }
            }}
          />
          <Form.Text className="text-muted">
            {todaysWordLoading ? (
              <span className="d-flex align-items-center gap-2 mt-1">
                <Spinner animation="border" size="sm" />
                Loading today's word...
              </span>
            ) : todaysWord ? (
              <span className="mt-1">
                Today's word: <strong className="font-monospace">{todaysWord}</strong>
              </span>
            ) : (
              <span className="mt-1 text-warning">Today's word not available</span>
            )}
          </Form.Text>
        </Form.Group>

        <hr />

        <p className="mt-3">
          {useTodaysWord
            ? "Today's word is being used. Turn off the switch above to enter a custom answer."
            : 'Enter a custom answer to analyze your guesses:'}
        </p>
        <Form.Control
          type="text"
          value={answerInput}
          onChange={(e) => {
            setAnswerInput(e.target.value.toLocaleUpperCase())
          }}
          disabled={useTodaysWord}
          placeholder={useTodaysWord ? '' : 'Enter custom answer'}
          maxLength={5}
          className="text-uppercase font-monospace"
        />
      </Modal.Body>

      <Modal.Footer>
        <Button onClick={handleClose} variant="secondary">
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  )
}

export default WordListModal
