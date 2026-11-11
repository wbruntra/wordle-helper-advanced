import { useEffect, useState } from 'preact/hooks'

export type AsyncState<T> =
  | { status: 'loading' }
  /** `stale` means `value` is from the previous inputs while a new result is being computed. */
  | { status: 'ready'; value: T; stale?: boolean }
  | { status: 'error'; message: string }

/**
 * Run a cancellable async/worker job whenever `deps` change, keeping the last
 * result visible (as `stale`) until the new one arrives. `start` receives
 * `resolve`/`reject` callbacks and returns a cancel function, which runs when
 * the deps change again or the component unmounts.
 */
export function useJob<T>(
  start: (resolve: (value: T) => void, reject: (message: string) => void) => () => void,
  deps: unknown[],
  enabled = true,
): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({ status: 'loading' })

  useEffect(() => {
    if (!enabled) return
    // Keep showing the previous result while recomputing, so the layout doesn't jump.
    setState((current) => (current.status === 'ready' ? { ...current, stale: true } : { status: 'loading' }))
    return start(
      (value) => setState({ status: 'ready', value }),
      (message) => setState({ status: 'error', message }),
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, enabled])

  return state
}
