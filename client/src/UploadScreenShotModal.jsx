import Button from 'react-bootstrap/Button'
import Modal from 'react-bootstrap/Modal'
import FileUpload from './FileUpload'
import axios from 'axios'
import { useState } from 'react'

function UploadScreenShotModal({ show, handleClose, setGuesses }) {
  const [fileUrl, setFileUrl] = useState(
    'https://test-projects.us-east-1.linodeobjects.com/wordle/wfjXDNQr.png',
  )

  const interpretScreenshot = async () => {
    const response = await axios.post('/api/interpret-guesses', {
      fileUrl,
    })

    console.log(response.data)

    setGuesses(response.data.guesses)
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
              <button
                onClick={() => {
                  interpretScreenshot()
                }}
                className="btn btn-primary"
              >
                Interpret
              </button>
            )}
          </div>
        </div>
      </Modal.Body>

      <Modal.Footer>
        <Button onClick={handleClose} variant="secondary">
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  )
}

export default UploadScreenShotModal
