import Button from 'react-bootstrap/Button'
import Modal from 'react-bootstrap/Modal'
import FileUpload from './FileUpload'
import axios from 'axios'
import { useState, useEffect } from 'react'
import Spinner from 'react-bootstrap/Spinner'
import Alert from 'react-bootstrap/Alert'

function UploadScreenShotModal({ show, handleClose, setGuesses }) {
  const [fileUrl, setFileUrl] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const interpretScreenshot = async (url) => {
    try {
      setIsLoading(true)
      setErrorMessage('') // Clear any previous error
      setSuccessMessage('') // Clear any previous success message

      const response = await axios.post('/api/interpret-guesses', {
        fileUrl: url,
      })

      console.log(response.data)
      setGuesses(response.data.guesses)
      setSuccessMessage('Screenshot successfully processed!') // Show success message
      // Optionally close the modal after successful interpretation
      handleClose()
    } catch (error) {
      console.error('Error interpreting screenshot:', error)
      setErrorMessage('Something went wrong while processing the screenshot. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // Trigger interpretation when fileUrl changes and is not empty
  useEffect(() => {
    if (fileUrl) {
      interpretScreenshot(fileUrl)
    }
  }, [fileUrl])

  return (
    <Modal show={show} onHide={handleClose}>
      <Modal.Header closeButton>
        <Modal.Title>Upload Screenshot</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <div className="d-flex flex-column">
          <div>
            <FileUpload fileUrl={fileUrl} setFileUrl={setFileUrl} />
          </div>
          {isLoading && (
            <div className="mt-2">
              <Spinner
                animation="border"
                size="sm"
                role="status"
                aria-hidden="true"
                className="me-2"
              />
              <span>Processing...</span>
            </div>
          )}
          {errorMessage && (
            <Alert variant="danger" className="mt-3">
              {errorMessage}
            </Alert>
          )}
          {successMessage && (
            <Alert variant="success" className="mt-3">
              {successMessage}
            </Alert>
          )}
        </div>
      </Modal.Body>

      <Modal.Footer>
        <Button
          onClick={() => interpretScreenshot(fileUrl)}
          variant="primary"
          disabled={!fileUrl || isLoading}
        >
          Process Screenshot
        </Button>
        <Button onClick={handleClose} variant="secondary" disabled={isLoading}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  )
}

export default UploadScreenShotModal
