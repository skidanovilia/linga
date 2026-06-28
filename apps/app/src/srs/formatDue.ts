/** A short, human "next due" label, e.g. "now", "in 12 min", "in 3 days". */
export function formatDue(date: Date | null, now: Date = new Date()): string {
  if (!date) return 'later'
  const deltaMs = date.getTime() - now.getTime()
  if (deltaMs <= 0) return 'now'

  const minutes = Math.round(deltaMs / 60_000)
  if (minutes < 60) return `in ${minutes} min`

  const hours = Math.round(minutes / 60)
  if (hours < 24) return `in ${hours} h`

  const days = Math.round(hours / 24)
  return `in ${days} day${days === 1 ? '' : 's'}`
}
