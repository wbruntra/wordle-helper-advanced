/** "Today", "Yesterday", or a long date, for a `YYYY-MM-DD` puzzle date. */
export function formatPuzzleDate(date: string, isLatest = false): string {
  const day = new Date(`${date}T00:00:00`)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const daysAgo = Math.round((today.getTime() - day.getTime()) / 86_400_000)
  const long = day.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  if (daysAgo === 0) return `Today — ${long}`
  if (daysAgo === 1) return `Yesterday — ${long}`
  return isLatest ? `Latest — ${long}` : long
}
