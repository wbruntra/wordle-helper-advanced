import { signal } from '@preact/signals'

/** Minimal hash router: `#/auto-play` -> `/auto-play`. */
const readPath = () => window.location.hash.replace(/^#/, '') || '/'

export const path = signal(readPath())

window.addEventListener('hashchange', () => {
  path.value = readPath()
  window.scrollTo(0, 0)
})

export const href = (to: string) => `#${to}`
