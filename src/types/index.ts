// Database types
export interface WordClassification {
  id: number;
  word: string;
  classification: string;
  definition?: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface FirstGuess {
  id: number;
  word: string;
  score: number;
  created_at?: Date;
}

export interface BatchJob {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  data?: any;
  result?: any;
  created_at?: Date;
  updated_at?: Date;
}

// API types
export interface S3Config {
  bucketName: string;
  region?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
}

export interface PresignedUrlOptions {
  key: string;
  bucket: string;
  contentType: string;
  expiresIn: number;
}

export interface S3Service {
  getPresignedUploadUrl(options: PresignedUrlOptions): Promise<string>;
  getPublicUrl(key: string, bucket: string): string;
}

// Wordle game types
export type GameType = 'wordle' | 'nerdle' | 'quordle' | 'octordle' | 'custom';

export interface GameState {
  board: string[][];
  currentRow: number;
  gameType: GameType;
  completed: boolean;
}

export interface GuessResult {
  word: string;
  score: number;
  suggestions: string[];
  analysis?: string;
}

// Image processing types
export interface ImageProcessingOptions {
  contrast?: number;
  brightness?: number;
  threshold?: number;
  resize?: {
    width: number;
    height: number;
  };
}

export interface LetterBoundary {
  x: number;
  y: number;
  width: number;
  height: number;
  character: string;
  confidence: number;
}

export interface WordleImageResult {
  guesses: string[];
  colors: string[][];
  confidence: number;
  letters: LetterBoundary[];
}

// OpenAI API types
export interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpenAICompletionRequest {
  model: string;
  messages: OpenAIMessage[];
  temperature?: number;
  max_tokens?: number;
}

export interface OpenAICompletionResponse {
  choices: Array<{
    message: OpenAIMessage;
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}