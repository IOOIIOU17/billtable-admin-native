import ConnPill from './ConnPill'
import StaleBanner from './StaleBanner'
import useNow from '../hooks/useNow'
import { ops, useOpsValue, STALE_MS } from '../state/ops'

// These two tick on their own (5x a second) so "updated 340 ms ago" keeps
// counting without re-rendering the whole screen.
export function LivePill() {
  const now = useNow(200)
  const conn = useOpsValue((s) => s.conn)
  const last = useOpsValue((s) => s.lastMsgAt)
  return <ConnPill conn={conn} age={last ? now - last : null} />
}

export function LiveStale() {
  const now = useNow(500)
  const conn = useOpsValue((s) => s.conn)
  const last = useOpsValue((s) => s.lastMsgAt)
  const err = useOpsValue((s) => s.lastError?.message || '')
  const age = last ? now - last : null
  if (age != null && age <= STALE_MS) return null
  // Give the very first connection a moment before shouting.
  if (age == null && (conn === 'connecting' || conn === 'reconnecting')) return null
  return <StaleBanner age={age} conn={conn} lastError={err ? { message: err } : null} onRetry={conn === 'paused' ? null : () => ops.reconnectNow()} />
}
