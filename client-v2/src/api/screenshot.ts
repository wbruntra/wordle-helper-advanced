import type { Guess } from '@wordle/shared'
import { api } from './client'

/** Upload a Wordle screenshot to storage and read the guesses out of it. */
export async function importGuessesFromScreenshot(file: File): Promise<Guess[]> {
  const { presignedUrl, fileUrl } = await api.presignedUrl(file)
  const upload = await fetch(presignedUrl, {
    method: 'PUT',
    headers: { 'x-amz-acl': 'public-read', 'Content-Type': file.type },
    body: file,
  })
  if (!upload.ok) throw new Error(`Upload failed (${upload.status})`)
  return api.interpretGuesses(fileUrl)
}
