import express, { Express, Request, Response, NextFunction } from 'express'
import cors from 'cors'
import logger from 'morgan'
import randomstring from 'randomstring'
import _ from 'lodash'
import path from 'path'
import s3 from './bunS3'
import config from './config'
import { getGuesses } from './getGuesses'
import { createExpressMiddleware } from '@trpc/server/adapters/express'
import { appRouter, createTRPCContext } from './src/server/trpc'

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

// tRPC middleware
app.use(
  '/api/trpc',
  createExpressMiddleware({
    router: appRouter,
    createContext: createTRPCContext,
  })
)

app.use('/', require('./routes/screenshot').default)

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
