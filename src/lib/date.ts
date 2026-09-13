/** ISO `YYYY-MM-DD` for a date, in the viewer's own timezone. */
export function isoDate(date: Date = new Date()): string {
  const offsetMs = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 10)
}

export function nowIso(): string {
  return new Date().toISOString()
}

/** `09/12` — the compact form used in price history rows. */
export function formatShortDate(iso: string): string {
  const date = new Date(`${iso.slice(0, 10)}T00:00:00`)
  if (Number.isNaN(date.getTime())) return iso
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${day}/${month}`
}

export function formatLongDate(iso: string): string {
  const date = new Date(iso.length <= 10 ? `${iso}T00:00:00` : iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

/** "Today" / "Yesterday" / "3 days ago" / a date for anything older. */
export function formatRelativeDay(iso: string): string {
  const date = new Date(iso.length <= 10 ? `${iso}T00:00:00` : iso)
  if (Number.isNaN(date.getTime())) return iso
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const days = Math.round((startOfDay(new Date()) - startOfDay(date)) / 86_400_000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days > 1 && days < 7) return `${days} days ago`
  if (days === -1) return 'Tomorrow'
  return formatLongDate(iso)
}
