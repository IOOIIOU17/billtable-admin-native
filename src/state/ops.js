// Realtime "how is the server doing" feed (CONTRACT-ops.md, section A).
//
//   1. POST /api/admin/ops/ticket (admin JWT)       -> one-use ticket (60 s)
//   2. GET  /api/admin/ops/stream?ticket=...         -> Server-Sent Events
//      React Native has no EventSource, so the stream is read with
//      `fetch` from 'expo/fetch' (SDK 52+ streams response bodies) and the
//      SSE text is parsed here. Events: snapshot (once), metrics (every
//      500 ms), security / alert / backup (the instant they happen).
//   3. Stream lost -> reconnect with backoff, a NEW ticket every time.
//   4. 3 failures in a row -> poll GET /api/admin/ops/summary every 2 s
//      ("polling"), and try the stream again every 30 s in the background.
//   5. App in the background -> close everything ("paused"). Back in the
//      foreground -> reconnect at once with a fresh ticket.
//   6. Any 401 -> signed out (api.signalUnauthorized).
//
// The screens read it with useOps() (useSyncExternalStore).
import { useSyncExternalStore } from 'react'
import { AppState } from 'react-native'
import { fetch as expoFetch } from 'expo/fetch'
import { BASE_URL } from '../services/config'
import { getToken, signalUnauthorized } from '../services/api'

export const CATEGORIES = ['signup', 'login', 'matching', 'order', 'restaurant', 'chat', 'payment', 'admin', 'other']
export const BACKUP_JOBS = ['db_backup', 'restore_drill', 'mac_pull']
export const STALE_MS = 3000

const HISTORY_MS = 120000 // sparklines: last 2 minutes
const HISTORY_EVERY_MS = 1000 // one point a second is plenty for a 60-pt-wide line
const WATCHDOG_MS = 5000 // stream open but no numbers this long -> broken
const POLL_MS = 2000
const SSE_MAX_FAILS = 3
const SSE_RETRY_WHILE_POLLING_MS = 30000
const STABLE_RESET_MS = 30000
const FETCH_TIMEOUT_MS = 8000
const MAX_SECURITY = 1000
const MAX_RESOLVED = 100

export function toMs(ts) {
  if (ts == null || ts === '') return null
  if (typeof ts === 'number') return ts < 1e12 ? ts * 1000 : ts
  if (/^\d+$/.test(String(ts))) return toMs(Number(ts))
  const n = Date.parse(ts)
  return Number.isNaN(n) ? null : n
}

const byNewest = (a, b) => (toMs(b.ts) || 0) - (toMs(a.ts) || 0) || (Number(b.id) || 0) - (Number(a.id) || 0)

class OpsError extends Error {
  constructor(message, extra = {}) {
    super(message)
    Object.assign(this, extra)
  }
}

function initialState() {
  return {
    conn: 'connecting', // connecting | live | reconnecting | polling | offline | paused
    everConnected: false,
    lastMsgAt: null, // Date.now() of the newest numbers from the server
    metrics: null,
    history: [], // [{ t, totals, inFlight, cats: { cat: { perMin, inFlight, p95Ms, err, blocked } } }]
    openAlerts: [],
    resolvedAlerts: [],
    security: [], // newest first
    securityHasMore: true,
    backups: {},
    limiter: null,
    lastError: null, // { message, at }
    failures: 0,
  }
}

// ---- SSE text parser ------------------------------------------------------
// Feed it decoded text in any chunk sizes; it calls onEvent(type, data) for
// every complete event. Comment lines (": keep-alive") are ignored.
export function createSseParser(onEvent) {
  let buf = ''
  return (text) => {
    buf += text
    for (;;) {
      const m = /\r?\n\r?\n/.exec(buf)
      if (!m) break
      const block = buf.slice(0, m.index)
      buf = buf.slice(m.index + m[0].length)
      let type = 'message'
      const data = []
      for (const line of block.split(/\r?\n/)) {
        if (!line || line.startsWith(':')) continue
        const i = line.indexOf(':')
        const field = i === -1 ? line : line.slice(0, i)
        let value = i === -1 ? '' : line.slice(i + 1)
        if (value.startsWith(' ')) value = value.slice(1)
        if (field === 'event') type = value
        else if (field === 'data') data.push(value)
      }
      if (data.length) onEvent(type, data.join('\n'))
    }
    // A server that never sends a blank line must not grow this forever.
    if (buf.length > 2_000_000) buf = ''
  }
}

class OpsClient {
  constructor() {
    this.listeners = new Set()
    this.state = initialState()
    this.running = false
    this.gen = 0
    this.timers = {}
    this.mode = 'sse'
    this.cursor = undefined
    this.lastHistoryAt = 0
  }

  subscribe = (fn) => {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }
  getState = () => this.state
  _set(patch) {
    this.state = { ...this.state, ...patch }
    for (const fn of this.listeners) fn()
  }
  _error(message) {
    this._set({ lastError: { message, at: Date.now() } })
  }

  // ---- lifecycle ----------------------------------------------------------
  start() {
    if (this.running) return
    this.running = true
    this.paused = false
    this.mode = 'sse'
    this.appState = AppState.currentState
    this.appSub = AppState.addEventListener('change', (next) => this._onAppState(next))
    this._connect()
  }

  stop() {
    this.running = false
    this.gen += 1
    this._closeStream()
    for (const k of Object.keys(this.timers)) this._clear(k)
    this.appSub?.remove()
    this.appSub = null
    this.cursor = undefined
    this.state = initialState()
    for (const fn of this.listeners) fn()
  }

  _onAppState(next) {
    const prev = this.appState
    this.appState = next
    if (!this.running) return
    if (next === 'background') {
      // iOS freezes the app soon after this anyway; close cleanly so the
      // server frees the slot (it allows 10 dashboards).
      this.paused = true
      this.gen += 1
      this._closeStream()
      for (const k of Object.keys(this.timers)) this._clear(k)
      this._set({ conn: 'paused' })
    } else if (next === 'active' && (this.paused || prev === 'background')) {
      this.paused = false
      this.mode = 'sse'
      this._set({ failures: 0, conn: 'reconnecting' })
      this._connect()
    }
  }

  _clear(name) {
    const t = this.timers[name]
    if (t) {
      clearTimeout(t)
      clearInterval(t)
    }
    delete this.timers[name]
  }

  _closeStream() {
    if (this.abort) {
      try {
        this.abort.abort()
      } catch {}
      this.abort = null
    }
    this._clear('watchdog')
    this._clear('stable')
  }

  // ---- HTTP ---------------------------------------------------------------
  async fetchJson(path, { method = 'GET', body } = {}) {
    const token = await getToken()
    if (!token) {
      this._unauthorized()
      throw new OpsError('Not signed in', { unauthorized: true })
    }
    const ctrl = new AbortController()
    const to = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS)
    let res
    try {
      res = await fetch(BASE_URL + path, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
          ...(body ? { 'Content-Type': 'application/json' } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: ctrl.signal,
      })
    } catch (e) {
      throw new OpsError(e?.name === 'AbortError' ? `The server did not answer within ${FETCH_TIMEOUT_MS / 1000} s` : 'Cannot reach the server (no internet?)', { network: true })
    } finally {
      clearTimeout(to)
    }
    if (res.status === 401) {
      this._unauthorized()
      throw new OpsError('Signed out: the admin session ended', { unauthorized: true })
    }
    const text = await res.text()
    let data = null
    try {
      data = text ? JSON.parse(text) : null
    } catch {
      throw new OpsError(`The server sent something unreadable (HTTP ${res.status}${/^\s*</.test(text) ? ' — maybe it is restarting' : ''})`)
    }
    if (!res.ok) throw new OpsError(data?.message || data?.error || `Server error (HTTP ${res.status})`, { status: res.status })
    return data
  }

  _unauthorized() {
    if (!this.running) return
    this.stop()
    signalUnauthorized('SESSION_ENDED')
  }

  // ---- live stream ----------------------------------------------------------
  async _connect() {
    if (!this.running || this.paused) return
    this._clear('retry')
    this._closeStream()
    this.gen += 1
    const gen = this.gen
    const probing = this.mode === 'polling'
    if (!this.state.everConnected && !probing) this._set({ conn: this.state.failures ? 'reconnecting' : 'connecting' })

    let ticket
    try {
      const r = await this.fetchJson('/api/admin/ops/ticket', { method: 'POST' })
      ticket = r?.ticket
      if (!ticket) throw new OpsError('The ticket reply had no ticket')
    } catch (e) {
      if (gen !== this.gen || e.unauthorized) return
      return this._streamFailed(gen, `Could not start the live feed: ${e.message}`, e.network)
    }
    if (gen !== this.gen || !this.running) return

    const ctrl = new AbortController()
    this.abort = ctrl
    this.lastStreamMsgAt = Date.now()
    this.timers.watchdog = setInterval(() => {
      if (gen !== this.gen) return
      if (Date.now() - this.lastStreamMsgAt > WATCHDOG_MS) this._streamFailed(gen, `No new numbers from the live feed for ${WATCHDOG_MS / 1000} s`)
    }, 1000)

    let res
    try {
      res = await expoFetch(`${BASE_URL}/api/admin/ops/stream?ticket=${encodeURIComponent(ticket)}`, {
        headers: { Accept: 'text/event-stream' },
        signal: ctrl.signal,
      })
    } catch (e) {
      if (gen !== this.gen) return
      return this._streamFailed(gen, 'Live feed connection failed', true)
    }
    if (gen !== this.gen) return
    if (res.status !== 200 || !res.body) {
      // 401 here is a used/expired TICKET, not a dead session: retry.
      return this._streamFailed(gen, `Live feed refused (HTTP ${res.status})`)
    }

    const parse = createSseParser((type, raw) => this._onStreamMessage(gen, type, raw, probing))
    const decoder = new TextDecoder()
    const reader = res.body.getReader()
    try {
      for (;;) {
        const { value, done } = await reader.read()
        if (gen !== this.gen) {
          try { reader.cancel() } catch {}
          return
        }
        if (done) break
        if (value) parse(decoder.decode(value, { stream: true }))
      }
    } catch (e) {
      if (gen !== this.gen) return
      return this._streamFailed(gen, 'Live feed connection lost', true)
    }
    if (gen === this.gen) this._streamFailed(gen, 'The server closed the live feed')
  }

  _onStreamMessage(gen, type, raw, probing) {
    if (gen !== this.gen) return
    if (type === 'metrics' || type === 'snapshot') this.lastStreamMsgAt = Date.now()
    let data
    try {
      data = JSON.parse(raw)
    } catch {
      return this._error(`Ignored a broken "${type}" message from the server`)
    }
    if (type === 'snapshot') {
      if (probing || this.mode === 'polling') {
        this._clear('poll')
        this.mode = 'sse'
      }
      this._applySnapshot(data)
      this._set({ conn: 'live', everConnected: true })
      this._clear('stable')
      this.timers.stable = setTimeout(() => this._set({ failures: 0 }), STABLE_RESET_MS)
      this.loadAlertHistory()
      return
    }
    if (this.state.conn !== 'live') return
    const patch = {}
    if (type === 'metrics') Object.assign(patch, this._metricsPatch(data), { lastMsgAt: Date.now() })
    else if (type === 'security') patch.security = this._mergeSecurity([data])
    else if (type === 'alert') Object.assign(patch, this._alertPatch([data], false))
    else if (type === 'backup' && data?.job) patch.backups = { ...this.state.backups, [data.job]: data }
    this._set(patch)
  }

  _streamFailed(gen, message, network) {
    if (gen !== this.gen || !this.running || this.paused) return
    this._closeStream()
    this.gen += 1
    this._error(message)
    if (this.mode === 'polling') {
      this.timers.retry = setTimeout(() => this._connect(), SSE_RETRY_WHILE_POLLING_MS)
      return
    }
    const failures = this.state.failures + 1
    if (failures >= SSE_MAX_FAILS) {
      this._set({ failures })
      return this._startPolling()
    }
    const delay = Math.min(500 * 2 ** (failures - 1), 8000) + Math.floor(Math.random() * 250)
    this._set({ failures, conn: network && !this.state.everConnected ? 'offline' : 'reconnecting' })
    this.timers.retry = setTimeout(() => this._connect(), delay)
  }

  // ---- polling fallback -------------------------------------------------------
  _startPolling() {
    this.mode = 'polling'
    this._set({ conn: 'polling' })
    const tick = async () => {
      if (!this.running || this.mode !== 'polling' || this.paused) return
      try {
        const snap = await this.fetchJson('/api/admin/ops/summary')
        if (!this.running || this.mode !== 'polling') return
        this._applySnapshot(snap)
        this._set({ conn: 'polling', everConnected: true })
      } catch (e) {
        if (e.unauthorized || !this.running) return
        this._error(`Update failed: ${e.message}`)
        if (e.network) this._set({ conn: 'offline' })
      }
      if (this.running && this.mode === 'polling' && !this.paused) this.timers.poll = setTimeout(tick, POLL_MS)
    }
    tick()
    this._clear('retry')
    this.timers.retry = setTimeout(() => this._connect(), SSE_RETRY_WHILE_POLLING_MS)
  }

  // ---- applying data ----------------------------------------------------------
  _applySnapshot(s) {
    if (!s || typeof s !== 'object') return this._error('The server sent an empty update')
    const patch = { lastMsgAt: Date.now() }
    if (s.metrics) Object.assign(patch, this._metricsPatch(s.metrics))
    if (Array.isArray(s.recentSecurity)) patch.security = this._mergeSecurity(s.recentSecurity)
    if (s.backups && typeof s.backups === 'object') patch.backups = { ...this.state.backups, ...s.backups }
    if (s.limiter) patch.limiter = s.limiter
    if (Array.isArray(s.openAlerts)) Object.assign(patch, this._alertPatch(s.openAlerts, true))
    this._set(patch)
  }

  _metricsPatch(m) {
    const t = Date.now()
    if (t - this.lastHistoryAt < HISTORY_EVERY_MS - 50) return { metrics: m }
    this.lastHistoryAt = t
    const cats = {}
    for (const c of CATEGORIES) {
      const x = m?.byCategory?.[c] || {}
      cats[c] = { perMin: x.perMin ?? 0, inFlight: x.inFlight ?? 0, p95Ms: x.p95Ms ?? 0, err: x.err5xxPerMin ?? 0, blocked: x.blocked429PerMin ?? 0 }
    }
    const history = this.state.history.filter((h) => h.t > t - HISTORY_MS)
    history.push({ t, totals: m?.totals || {}, inFlight: m?.inFlight ?? 0, cats })
    return { metrics: m, history }
  }

  _mergeSecurity(events) {
    const map = new Map(this.state.security.map((e) => [String(e.id), e]))
    for (const e of events) if (e && e.id != null) map.set(String(e.id), e)
    return [...map.values()].sort(byNewest).slice(0, Math.max(MAX_SECURITY, this.state.security.length))
  }

  // fullOpenList: the server's complete set of open alerts (snapshot); any
  // alert we had open that is missing has resolved in the meantime.
  _alertPatch(alerts, fullOpenList) {
    const open = new Map(this.state.openAlerts.map((a) => [String(a.id), a]))
    const resolved = new Map(this.state.resolvedAlerts.map((a) => [String(a.id), a]))
    let vanished = false
    if (fullOpenList) {
      const ids = new Set(alerts.map((a) => String(a.id)))
      for (const id of open.keys()) {
        if (!ids.has(id)) {
          open.delete(id)
          vanished = true
        }
      }
    }
    for (const a of alerts) {
      if (!a || a.id == null) continue
      const id = String(a.id)
      if (a.status === 'resolved') {
        open.delete(id)
        resolved.set(id, a)
      } else open.set(id, a)
    }
    if (vanished) setTimeout(() => this.loadAlertHistory(), 0)
    return {
      openAlerts: [...open.values()].sort((a, b) => (a.level === b.level ? byNewest(a, b) : a.level === 'critical' ? -1 : 1)),
      resolvedAlerts: [...resolved.values()]
        .sort((a, b) => (toMs(b.resolvedAt) || toMs(b.ts) || 0) - (toMs(a.resolvedAt) || toMs(a.ts) || 0))
        .slice(0, MAX_RESOLVED),
    }
  }

  // ---- actions used by the screens -------------------------------------------
  async loadAlertHistory() {
    const gen = this.gen
    try {
      const r = await this.fetchJson('/api/admin/ops/alerts?status=all&limit=100')
      if (gen !== this.gen || !Array.isArray(r?.alerts)) return
      const resolved = r.alerts.filter((a) => a.status === 'resolved' && !this.state.openAlerts.some((o) => String(o.id) === String(a.id)))
      this._set(this._alertPatch(resolved, false))
    } catch (e) {
      if (!e.unauthorized) this._error(`Could not load past alerts: ${e.message}`)
    }
  }

  // Pull to refresh on the Security tab: newest page from the database.
  async refreshSecurity() {
    const r = await this.fetchJson('/api/admin/ops/events?limit=100')
    const events = Array.isArray(r?.events) ? r.events : []
    this._set({ security: this._mergeSecurity(events) })
    if (this.cursor === undefined) {
      this.cursor = r?.nextBefore ?? null
      this._set({ securityHasMore: r?.nextBefore != null })
    }
    return events.length
  }

  // "Load older": the page before the oldest event we hold.
  async loadOlderSecurity() {
    let before = this.cursor
    if (before === undefined || before === null) before = this.state.security.at(-1)?.id
    const q = before != null ? `&before=${encodeURIComponent(String(before))}` : ''
    const r = await this.fetchJson(`/api/admin/ops/events?limit=100${q}`)
    const events = Array.isArray(r?.events) ? r.events : []
    this.cursor = r?.nextBefore ?? null
    const map = new Map(this.state.security.map((e) => [String(e.id), e]))
    for (const e of events) if (e && e.id != null) map.set(String(e.id), e)
    this._set({ security: [...map.values()].sort(byNewest), securityHasMore: r?.nextBefore != null && events.length > 0 })
    return events.length
  }

  async setLimiter(enabled, threshold) {
    const r = await this.fetchJson('/api/admin/ops/limiter', { method: 'POST', body: { enabled: !!enabled, threshold: Number(threshold) } })
    this._set({ limiter: { enabled: !!r?.enabled, threshold: r?.threshold } })
    return r
  }

  reconnectNow() {
    if (!this.running) return
    this._clear('poll')
    this.mode = 'sse'
    this._set({ failures: 0, conn: 'reconnecting' })
    this._connect()
  }
}

export const ops = new OpsClient()

export function useOps() {
  return useSyncExternalStore(ops.subscribe, ops.getState)
}

// Subscribe to one small piece (must return a primitive, e.g. a string),
// so a component only re-renders when that piece changes, not 2x a second.
export function useOpsValue(select) {
  return useSyncExternalStore(ops.subscribe, () => select(ops.getState()))
}
