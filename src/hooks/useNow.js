import { useEffect, useState } from 'react'

// Re-renders the caller every `ms` so "updated 340 ms ago" keeps counting
// even when no new data arrives (which is exactly when it matters).
export default function useNow(ms = 1000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms)
    return () => clearInterval(t)
  }, [ms])
  return now
}
