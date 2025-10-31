import Button from 'react-bootstrap/Button'
import Modal from 'react-bootstrap/Modal'

function WordListModal({ show, handleClose, answerInput, setAnswerInput }) {
  return (
    <Modal show={show} onHide={handleClose}>
      <Modal.Header closeButton>
        <Modal.Title>Settings</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <p className="mt-3">
          If you already know the answer and just want to analyze your guesses, write the solution
          here and the keys will be generated automatically:
        </p>
        <p>
          <input
            type="text"
            value={answerInput}
            onChange={(e) => {
              setAnswerInput(e.target.value.toLocaleUpperCase())
            }}
          />
        </p>
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
