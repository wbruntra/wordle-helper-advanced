/** Calendar-date helpers for `YYYY-MM-DD` puzzle dates, in the user's local time. */

const pad = (n: number) => String(n).padStart(2, '0')

const toIso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

export const todayIso = () => toIso(new Date())

/** The date `days` after (or before, if negative) `date`. */
export function shiftIso(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00`)
  d.setDate(d.getDate() + days)
  return toIso(d)
}
