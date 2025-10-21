const express = require('express')
const cors = require('cors')
const logger = require('morgan')

const randomstring = require('randomstring')
const _ = require('lodash')
const path = require('path')
const s3 = require('./bunS3')
const { s3: config } = require('./config')
const { getGuesses } = require('./getGuesses')

const app = express()

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

  const presignedUrl = await s3.getPresignedUploadUrl({
    key,
    bucket: config.bucketName,
    contentType: fileType,
    expiresIn: 180,
  })

  const fileUrl = s3.getPublicUrl(key, config.bucketName)

  return res.send({
    presignedUrl,
    fileUrl,
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

module.exports = app
