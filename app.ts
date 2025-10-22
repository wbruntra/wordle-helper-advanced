import express, { Express, Request, Response, NextFunction } from 'express'
import cors from 'cors'
import logger from 'morgan'
import randomstring from 'randomstring'
import _ from 'lodash'
import path from 'path'
import s3 from './bunS3'
import config from './config'
import { getGuesses } from './getGuesses'

// Extended Request interface to include requestId
interface ExtendedRequest extends Request {
  requestId?: string
}

// Type definitions for API requests/responses
interface PresignedUrlRequest {
  fileName: string
  fileType: string
}

interface PresignedUrlResponse {
  presignedUrl: string
  fileUrl: string
}

interface InterpretGuessesRequest {
  imageUrl: string
  board: string[][]
  gameType?: string
}

const app: Express = express()

// Middleware
app.use(cors())
app.use(express.json())

// Add HTTP request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  logger('dev')(req, res, next)
})

// Add request ID middleware
app.use((req: ExtendedRequest, res: Response, next: NextFunction) => {
  req.requestId = Date.now().toString(36) + Math.random().toString(36).substr(2)
  next()
})

// Generate presigned URL route
app.post(
  '/api/get-presigned-url',
  async (
    req: Request<{}, PresignedUrlResponse, PresignedUrlRequest>,
    res: Response<PresignedUrlResponse>,
  ) => {
    try {
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
        bucket: config.s3.bucketName,
        contentType: fileType,
        expiresIn: 180,
      })

      const fileUrl = s3.getPublicUrl(key, config.s3.bucketName)

      res.json({
        presignedUrl,
        fileUrl,
      })
    } catch (error) {
      console.error('Error generating presigned URL:', error)
      res.status(500).json({ error: 'Failed to generate presigned URL' } as any)
    }
  },
)

// Interpret guesses route
app.post(
  '/api/interpret-guesses',
  async (req: Request<{}, any, InterpretGuessesRequest>, res: Response) => {
    try {
      const { imageUrl, board, gameType = 'wordle' } = req.body

      // Call the getGuesses function with proper typing
      const result = await getGuesses(imageUrl)

      res.json(result)
    } catch (error) {
      console.error('Error interpreting guesses:', error)
      res.status(500).json({ error: 'Failed to interpret guesses' })
    }
  },
)

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  })
})

// Error handling middleware
app.use((err: Error, req: ExtendedRequest, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', err)
  res.status(500).json({
    error: 'Internal server error',
    requestId: req.requestId,
  })
})

export default app
