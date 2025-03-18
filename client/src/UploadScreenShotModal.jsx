import Button from 'react-bootstrap/Button'
import Modal from 'react-bootstrap/Modal'
import FileUpload from './FileUpload'
import axios from 'axios'
import { useState } from 'react'
import Spinner from 'react-bootstrap/Spinner'

function UploadScreenShotModal({ show, handleClose, setGuesses }) {
  const [fileUrl, setFileUrl] = useState('')
  const [isLoading, setIsLoading] = useState(false) // Added loading state

  const interpretScreenshot = async () => {
    try {
      setIsLoading(true) // Show loading indicator
      const response = await axios.post('/api/interpret-guesses', {
        fileUrl,
      })

      console.log(response.data)
      setGuesses(response.data.guesses)
    } catch (error) {
      console.error('Error interpreting screenshot:', error)
    } finally {
      setIsLoading(false) // Hide loading indicator
    }
  }

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
          <div>
            {fileUrl && (
              <Button
                onClick={interpretScreenshot}
                className="btn btn-primary"
                disabled={isLoading} // Disable button while loading
              >
                {isLoading ? (
                  <>
                    <Spinner
                      as="span"
                      animation="border"
                      size="sm"
                      role="status"
                      aria-hidden="true"
                      className="me-2"
                    />
                    Loading...
                  </>
                ) : (
                  'Interpret'
                )}
              </Button>
            )}
          </div>
        </div>
      </Modal.Body>

      <Modal.Footer>
        <Button onClick={handleClose} variant="secondary" disabled={isLoading}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  )
}

export default UploadScreenShotModal
