import { useState } from 'preact/hooks'
import { importGuessesFromScreenshot } from '../api/screenshot'
import type { Guess } from '@wordle/shared'
import { Modal } from './ui/Modal'

interface ScreenshotDialogProps {
  open: boolean
  onClose: () => void
  onImport: (guesses: Guess[]) => void
}

/** Pick a Wordle screenshot; the server reads the guesses and colours out of it. */
export function ScreenshotDialog({ open, onClose, onImport }: ScreenshotDialogProps) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFile = async (file: File | undefined) => {
    if (!file) return
    setBusy(true)
    setError(null)
    try {
      onImport(await importGuessesFromScreenshot(file))
      onClose()
    } catch (err) {
      console.error('Screenshot import failed', err)
      setError('Couldn’t read that screenshot. Try a clearer, uncropped one.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Import screenshot">
      <p class="muted" style={{ marginBottom: '12px' }}>
        Choose a screenshot of a Wordle board. Its guesses will replace the ones you’ve entered.
      </p>
      <div class="field">
        <label for="screenshot-file">Screenshot</label>
        <input id="screenshot-file" type="file" accept="image/*" disabled={busy} onChange={(e) => handleFile(e.currentTarget.files?.[0])} />
      </div>
      {busy && <p class="muted"><span class="spinner" /> Reading screenshot…</p>}
      {error && <p class="notice notice-error">{error}</p>}
    </Modal>
  )
}
