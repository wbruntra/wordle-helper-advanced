import express, { Express, Request, Response, NextFunction } from 'express'
import randomstring from 'randomstring'
import path from 'path'
import s3 from '../bunS3'
import config from '../config'
import { getGuessesFromImage } from '../getGuessesFromImage'

const router = express.Router()

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
  fileUrl: string
  board: string[][]
  gameType?: string
}

// Generate presigned URL route
router.post(
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
router.post(
  '/api/interpret-guesses',
  async (req: Request<{}, any, InterpretGuessesRequest>, res: Response) => {
    try {
      const { fileUrl, board, gameType = 'wordle' } = req.body

      // Validate fileUrl parameter
      if (!fileUrl || typeof fileUrl !== 'string') {
        console.error('Invalid or missing fileUrl:', fileUrl)
        return res.status(400).json({ error: 'fileUrl is required and must be a valid URL string' })
      }

      // Call the getGuessesFromImage function with proper typing
      const result = await getGuessesFromImage(fileUrl)

      res.json(result)
    } catch (error) {
      console.error('Error interpreting guesses:', error)
      res.status(500).json({ error: 'Failed to interpret guesses' })
    }
  },
)

export default router
