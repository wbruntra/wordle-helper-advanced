import React, { useState } from 'react'
import axios from 'axios'

function FileUpload({ fileUrl, setFileUrl }) {
  const [selectedFile, setSelectedFile] = useState(null)
  const [uploadStatus, setUploadStatus] = useState('')

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0])
    setUploadStatus('')
    setFileUrl('')
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      setUploadStatus('Please select a file first')
      return
    }

    setUploadStatus('Preparing upload...')

    try {
      // 1. Get presigned URL from backend
      const { data } = await axios.post('/api/get-presigned-url', {
        fileName: selectedFile.name,
        fileType: selectedFile.type,
      })

      setUploadStatus('Uploading to S3...')

      // 2. Upload directly to S3 using presigned URL

      await axios.put(data.presignedUrl, selectedFile, {
        headers: {
          'x-amz-acl': 'public-read',
          'Content-Type': selectedFile.type,
        },
      })

      setUploadStatus('File uploaded successfully!')
      setFileUrl(data.fileUrl)
      setSelectedFile(null)
    } catch (error) {
      setUploadStatus('Error uploading file: ' + error.message)
    }
  }

  return (
    <div style={{ padding: '20px' }}>
      <h2>Upload File to S3</h2>

      <input type="file" onChange={handleFileChange} style={{ margin: '10px 0' }} />

      <button
        onClick={handleUpload}
        disabled={!selectedFile}
        style={{
          padding: '8px 16px',
          backgroundColor: selectedFile ? '#007bff' : '#ccc',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: selectedFile ? 'pointer' : 'not-allowed',
        }}
      >
        Upload
      </button>

      {uploadStatus && (
        <p
          style={{
            margin: '10px 0',
            color:
              uploadStatus.includes('Error') || uploadStatus.includes('failed') ? 'red' : 'green',
          }}
        >
          {uploadStatus}
        </p>
      )}

      {fileUrl && (
        <div>
          <p>File URL:</p>
          <a href={fileUrl} target="_blank" rel="noopener noreferrer">
            {fileUrl}
          </a>
        </div>
      )}
    </div>
  )
}

export default FileUpload
