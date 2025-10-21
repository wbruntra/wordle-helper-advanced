import Button from 'react-bootstrap/Button'
import Modal from 'react-bootstrap/Modal'

function WordListModal({ show, handleClose, wordList, setWordList, answerInput, setAnswerInput }) {
  const options = [
    { value: 'nytSolutions', label: 'Only Solutions' },
    { value: 'commonPlusOfficial', label: 'Solutions + Common Words' },
    { value: 'nytAll', label: 'All Valid Words' },
  ]

  return (
    <Modal show={show} onHide={handleClose}>
      <Modal.Header closeButton>
        <Modal.Title>Choose Wordlist</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {/* <p>Select a Wordlist to use</p>

        <select
          value={wordList}
          onChange={(e) => {
            setWordList(e.target.value)
          }}
        >
          {options.map((option) => (
            <option key={`option-${option.value}`} value={option.value}>
              {option.label}
            </option>
          ))}
        </select> */}

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
