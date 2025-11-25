export function formatDuration(seconds: number): string {
  if (Number.isNaN(seconds) || seconds <= 0) {
    return "Unknown duration"
  }

  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainingSeconds = seconds % 60

  const parts = [
    hours > 0 && `${hours}h`,
    minutes > 0 && `${minutes}m`,
    (remainingSeconds > 0 || (hours === 0 && minutes === 0)) && `${remainingSeconds}s`,
  ].filter(Boolean)

  return parts.join(" ")
}

