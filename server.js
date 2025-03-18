const express = require('express')
const cors = require('cors')
const logger = require('morgan')

const randomstring = require('randomstring')
const _ = require('lodash')
const path = require('path')
const getPresignedURL = require('./getPresignedURL')
const secrets = require('./secrets')
// const getGuessesFromImage = require('./getGuessesFromImage')
const { getGuesses } = require('./getGuesses')

require('dotenv').config()

const app = express()
const port = process.env.PORT || 3001

// Middleware
app.use(cors())
app.use(express.json())

// Add HTTP request logging
app.use((req, res, next) => {
  logger('dev')(req, res, next)
})

// Add request ID middleware
app.use((req, res, next) => {
  req.requestId = Date.now().toString(36) + Math.random().toString(36).substr(2)
  next()
})

// Generate presigned URL route
app.post('/api/get-presigned-url', async (req, res) => {
  const { fileName, fileType } = req.body

  const randomname = randomstring.generate({
    length: 8,
    charset: 'alphabetic',
  })

  const fileExtension = path.extname(fileName)
  const key = `wordle/${randomname}${fileExtension}`

  console.log(key, fileType)

  const url = await getPresignedURL(key, fileType)

  return res.send({
    presignedUrl: url,
    fileUrl: `https://${secrets.LINODE_BUCKET_NAME}.${secrets.LINODE_S3_ENDPOINT}/${key}`,
    key: key,
  })
})

app.post('/api/interpret-guesses', async (req, res) => {
  const { fileUrl } = req.body

  const guesses = await getGuesses(fileUrl)

  res.send({ guesses })
})

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message
  res.locals.error = err

  console.log('Error:', err)
  // render the error page
  res.status(err.status || 500)
  res.send('error!')
})

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`)
})
