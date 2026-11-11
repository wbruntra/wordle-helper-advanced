import { effect, signal, type Signal } from '@preact/signals'

const PREFIX = 'wordle-helper:'

/** A signal that survives reloads via localStorage (silently in-memory if storage is unavailable). */
export function persistedSignal<T>(key: string, initial: T): Signal<T> {
  let value = initial
  try {
    const stored = localStorage.getItem(PREFIX + key)
    if (stored !== null) value = JSON.parse(stored) as T
  } catch {
    // Unavailable or corrupt storage: fall back to the initial value.
  }

  const state = signal(value)
  effect(() => {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(state.value))
    } catch {
      // Storage full or blocked: nothing useful to do.
    }
  })
  return state
}
