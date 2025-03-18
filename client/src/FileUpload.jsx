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
      const { data } = await axios.post('/api/get-presigned-url', {
        fileName: selectedFile.name,
        fileType: selectedFile.type,
      })

      setUploadStatus('Uploading screenshot...')

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
    <div
      style={{
        padding: '15px',
        display: 'flex',
        flexDirection: 'column',
        gap: '15px',
        maxWidth: '100%',
        boxSizing: 'border-box',
      }}
    >
      <h2
        style={{
          fontSize: '1.5rem',
          margin: 0,
          '@media (maxWidth: 768px)': {
            fontSize: '1.2rem',
          },
        }}
      >
        Upload Screenshot
      </h2>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          '@media (maxWidth: 768px)': {
            gap: '8px',
          },
        }}
      >
        <input
          type="file"
          onChange={handleFileChange}
          style={{
            width: '100%',
            padding: '8px',
            boxSizing: 'border-box',
          }}
        />

        <button
          onClick={handleUpload}
          disabled={!selectedFile}
          style={{
            padding: '10px 20px',
            backgroundColor: selectedFile ? '#007bff' : '#ccc',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: selectedFile ? 'pointer' : 'not-allowed',
            width: '100%',
            maxWidth: '200px',
            fontSize: '1rem',
            '@media (maxWidth: 768px)': {
              padding: '8px 16px',
              fontSize: '0.9rem',
            },
          }}
        >
          Upload
        </button>
      </div>

      {uploadStatus && (
        <p
          style={{
            margin: 0,
            padding: '8px',
            color:
              uploadStatus.includes('Error') || uploadStatus.includes('failed') ? 'red' : 'green',
            wordBreak: 'break-word',
            fontSize: '0.9rem',
          }}
        >
          {uploadStatus}
        </p>
      )}

      {fileUrl && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '5px',
          }}
        >
          <p style={{ margin: 0, fontSize: '0.9rem' }}>File URL:</p>
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              wordBreak: 'break-all',
              color: '#007bff',
              textDecoration: 'none',
              fontSize: '0.85rem',
            }}
          >
            {fileUrl}
          </a>
        </div>
      )}
    </div>
  )
}

export default FileUpload
