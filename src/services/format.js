// Plain-English words and number formats for the owner. The thresholds are
// the same numbers as the server's alert rules (CONTRACT-ops.md, A) so a red
// light here and an alert on the phone always agree.
import { toMs, BACKUP_JOBS } from '../state/ops'
import { colors, status } from '../styles/tokens'

export const RULES = {
  err5xxPerMin: 5,
  blocked429PerMin: 50,
  memoryPct: 85,
  eventLoopLagMs: 200,
  dbWaiting: 5,
  inFlight: 40,
  inFlightPctOfLimiter: 0.8,
  backupStaleH: 36,
  drillStaleDays: 35,
  macStaleH: 36,
}

export const CATEGORY_LABEL = {
  signup: 'Sign-ups',
  login: 'Logins',
  matching: 'Find a table',
  order: 'Orders',
  restaurant: 'Restaurant app',
  chat: 'Party chat',
  payment: 'Payments',
  admin: 'Admin',
  other: 'Everything else',
}

export const SECURITY_LABEL = {
  signup: 'New sign-up',
  login_failed: 'Failed login (wrong password)',
  login_locked: 'Account locked after too many failed logins',
  admin_login: 'Admin signed in',
  admin_login_failed: 'Failed ADMIN login',
  passcode_failed: 'Wrong party passcode',
  passcode_locked: 'Party passcode locked (too many wrong tries)',
  rate_limited: 'Blocked for sending too many requests',
  settings_changed: 'Admin setting changed',
  token_revoked_used: 'Someone used an old, cancelled login',
  password_changed: 'Password changed',
  account_deleted: 'Account deleted',
  verification_failed: 'Wrong email verification code',
}

export const RULE_LABEL = {
  err5xx: 'Server errors',
  blocked429: 'Many requests blocked',
  login_failed: 'Many failed logins',
  passcode_failed: 'Many wrong party passcodes',
  db_waiting: 'Database queue is building up',
  memory: 'Server memory almost full',
  event_loop_lag: 'Server is slow to respond',
  inflight: 'Too many requests at the same time',
  backup_stale: 'Database backup is late',
  backup_failed: 'A backup failed',
  restore_drill_stale: 'Restore test is overdue',
}

export const RULE_HINT = {
  err5xx: 'Something broke on our side and customers saw an error. Check Sentry or the Render logs.',
  blocked429: 'Someone is sending far too many requests. Often a bot; the server is already turning them away.',
  login_failed: 'Many wrong passwords in one minute. Someone may be guessing passwords.',
  passcode_failed: 'Many wrong party passcodes. Someone may be trying to get into parties.',
  db_waiting: 'Requests are queueing for the database. The app feels slow or times out.',
  memory: 'The server is close to running out of memory and may restart.',
  event_loop_lag: 'The server is too busy to answer quickly. Everyone feels the app is slow.',
  inflight: 'A lot of requests at the same moment. Watch it; the emergency brake is on the Control tab.',
  backup_stale: 'The nightly database backup has not succeeded for over 36 hours.',
  backup_failed: 'A backup job reported a failure. Your data is fine, but the safety copy is not.',
  restore_drill_stale: 'Nobody has tested restoring a backup for over 35 days.',
}

export const JOB_LABEL = {
  db_backup: ['Daily database backup', 'Encrypted copy of the database in the cloud.'],
  restore_drill: ['Restore test', 'Proof that a backup can really be brought back.'],
  mac_pull: ['Copy to the Mac', 'Daily download of the newest backup to your Mac.'],
}

export const CONN_LABEL = {
  connecting: 'Connecting…',
  live: 'Live',
  reconnecting: 'Reconnecting…',
  polling: 'Polling every 2 s',
  offline: 'Offline',
  paused: 'Paused',
}

export const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null)
export const fmt = (v, digits = 0) => (num(v) == null ? '–' : num(v).toLocaleString('en-US', { maximumFractionDigits: digits }))

export function ago(ts, now = Date.now()) {
  const t = toMs(ts)
  if (t == null) return 'never'
  const s = Math.max(0, Math.round((now - t) / 1000))
  if (s < 5) return 'just now'
  if (s < 60) return `${s} s ago`
  const m = Math.round(s / 60)
  if (m < 60) return `${m} min ago`
  const h = Math.round(m / 6) / 10
  if (h < 48) return `${h < 10 ? h : Math.round(h)} h ago`
  return `${Math.round(h / 24)} days ago`
}

export function span(sec) {
  const s = num(sec)
  if (s == null) return '–'
  if (s < 60) return `${Math.round(s)} s`
  if (s < 3600) return `${Math.floor(s / 60)} min`
  if (s < 86400) return `${Math.floor(s / 3600)} h ${Math.floor((s % 3600) / 60)} min`
  return `${Math.floor(s / 86400)} d ${Math.floor((s % 86400) / 3600)} h`
}

export function bytes(b) {
  const n = num(b)
  if (n == null) return '–'
  if (n < 1024) return `${n} B`
  if (n < 1048576) return `${(n / 1024).toFixed(1)} KB`
  if (n < 1073741824) return `${(n / 1048576).toFixed(1)} MB`
  return `${(n / 1073741824).toFixed(2)} GB`
}

export function clock(ts) {
  const t = toMs(ts)
  return t == null ? '–' : new Date(t).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' })
}

export function dateTime(ts) {
  const t = toMs(ts)
  return t == null ? '–' : new Date(t).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export function money(v) {
  const n = Number(v)
  return Number.isFinite(n) ? `$${n.toFixed(2)}` : '–'
}

// ---- traffic-light levels: 'ok' | 'warn' | 'bad' | 'none' -----------------
export const worst = (...lv) => (lv.includes('bad') ? 'bad' : lv.includes('warn') ? 'warn' : lv.includes('ok') ? 'ok' : 'none')
export const lvl5xx = (v) => (num(v) == null ? 'none' : v >= RULES.err5xxPerMin ? 'bad' : v > 0 ? 'warn' : 'ok')
export const lvl429 = (v) => (num(v) == null ? 'none' : v >= RULES.blocked429PerMin ? 'bad' : v >= RULES.blocked429PerMin / 2 ? 'warn' : 'ok')
export const inFlightLimit = (limiter) =>
  limiter?.enabled && num(limiter.threshold) ? Math.min(RULES.inFlight, Math.floor(limiter.threshold * RULES.inFlightPctOfLimiter)) : RULES.inFlight
export const lvlInFlight = (v, limit) => (num(v) == null ? 'none' : v >= limit ? 'bad' : v >= limit / 2 ? 'warn' : 'ok')
export const memPct = (m) => (num(m?.memRssMb) != null && num(m?.memLimitMb) ? (m.memRssMb / m.memLimitMb) * 100 : null)
export const lvlMem = (p) => (p == null ? 'none' : p > RULES.memoryPct ? 'bad' : p > 70 ? 'warn' : 'ok')
export const lvlLag = (v) => (num(v) == null ? 'none' : v > RULES.eventLoopLagMs ? 'bad' : v > RULES.eventLoopLagMs / 2 ? 'warn' : 'ok')
export const lvlCpu = (v) => (num(v) == null ? 'none' : v >= 80 ? 'warn' : 'ok')
export const lvlDb = (db) => (num(db?.waiting) == null ? 'none' : db.waiting >= RULES.dbWaiting ? 'bad' : db.waiting > 0 ? 'warn' : 'ok')
export const lvlUptime = (s) => (num(s) == null ? 'none' : s < 300 ? 'warn' : 'ok')
export const lvlHeap = (m) => (num(m?.heapUsedMb) == null ? 'none' : 'ok')

export function backupLevel(b, job, now) {
  if (!b || b.lastStatus === 'never' || (!b.lastAt && !b.lastOkAt)) return 'none'
  if (b.lastStatus === 'fail' || b.stale) return 'bad'
  const okAt = toMs(b.lastOkAt)
  const limitH = job === 'restore_drill' ? RULES.drillStaleDays * 24 : job === 'mac_pull' ? RULES.macStaleH : RULES.backupStaleH
  if (okAt == null || now - okAt > limitH * 3600000) return 'bad'
  return 'ok'
}

// Everything that is not fine, deduplicated by rule, so an open "memory"
// alert and a red memory light count as ONE problem.
export function collectIssues(s, now) {
  const items = new Map()
  const add = (key, level, text) => {
    const cur = items.get(key)
    if (!cur || (level === 'bad' && cur.level !== 'bad')) items.set(key, { key, level, text })
  }
  for (const a of s.openAlerts) add(a.rule || `alert-${a.id}`, a.level === 'critical' ? 'bad' : 'problem', RULE_LABEL[a.rule] || a.message)
  const m = s.metrics
  if (m) {
    const t = m.totals || {}
    const checks = [
      ['err5xx', lvl5xx(t.err5xxPerMin), 'Server errors'],
      ['blocked429', lvl429(t.blocked429PerMin), 'Requests being blocked'],
      ['inflight', lvlInFlight(m.inFlight, inFlightLimit(s.limiter)), 'Many requests at once'],
      ['memory', lvlMem(memPct(m)), 'Memory'],
      ['event_loop_lag', lvlLag(m.eventLoopLagMs), 'Server response delay'],
      ['db_waiting', lvlDb(m.db), 'Database queue'],
      ['cpu', lvlCpu(m.cpuPct), 'CPU busy'],
      ['uptime', lvlUptime(m.uptimeSec), 'Server restarted recently'],
    ]
    for (const [k, lv, text] of checks) if (lv === 'bad' || lv === 'warn') add(k, lv, text)
  }
  for (const job of BACKUP_JOBS) {
    const b = s.backups[job]
    if (backupLevel(b, job, now) === 'bad') {
      const rule = b?.lastStatus === 'fail' ? 'backup_failed' : job === 'restore_drill' ? 'restore_drill_stale' : job === 'db_backup' ? 'backup_stale' : `stale-${job}`
      add(rule, 'bad', `${JOB_LABEL[job][0]} ${b?.lastStatus === 'fail' ? 'failed' : 'is late'}`)
    }
  }
  const list = [...items.values()]
  return {
    problems: list.filter((i) => i.level === 'bad' || i.level === 'problem'),
    watch: list.filter((i) => i.level === 'warn'),
    anyRed: list.some((i) => i.level === 'bad'),
  }
}

export function overall(s, now) {
  const age = s.lastMsgAt ? now - s.lastMsgAt : null
  const stale = age == null || age > 3000
  const issues = collectIssues(s, now)
  let level
  let sentence
  if (s.conn === 'paused') {
    level = 'none'
    sentence = 'Paused while the app was in the background'
  } else if (stale) {
    level = 'none'
    sentence = s.everConnected ? "Can't confirm — the numbers are not fresh" : 'Connecting to the server…'
  } else if (issues.problems.length) {
    level = issues.anyRed ? 'bad' : 'warn'
    const n = issues.problems.length
    sentence = `${n} problem${n > 1 ? 's' : ''} need${n > 1 ? '' : 's'} attention`
  } else if (issues.watch.length) {
    level = 'warn'
    const n = issues.watch.length
    sentence = `Working — ${n} thing${n > 1 ? 's' : ''} to keep an eye on`
  } else {
    level = 'ok'
    sentence = 'All systems normal'
  }
  return { level, sentence, issues, age, stale }
}

// ---- security events in plain words -----------------------------------------
export function eventText(e) {
  const base = SECURITY_LABEL[e.type] || String(e.type || 'event').replace(/_/g, ' ')
  const d = e.detail || {}
  if (d.aggregated && d.count) return `${base} × ${d.count}`
  if (e.type === 'admin_login_failed' && d.reason === '2fa') return 'Failed ADMIN login (right password, wrong 2FA code)'
  if (e.type === 'rate_limited' && d.limiter) return `${base} (${String(d.limiter).replace(/_/g, ' ')})`
  if (e.type === 'settings_changed' && d.setting === 'limiter') {
    const n = d.new || {}
    return `Emergency brake changed: ${n.enabled ? 'ON' : 'OFF'}, limit ${n.threshold ?? '–'}`
  }
  return base
}

// Server already masks these; this only makes sure nothing unmasked slips
// onto the screen if an older server ever sends one.
export function maskIp(ip) {
  if (!ip) return null
  const s = String(ip)
  if (s.includes('*')) return s
  const v4 = s.split('.')
  if (v4.length === 4) return `${v4[0]}.${v4[1]}.${v4[2]}.*`
  const v6 = s.split(':')
  return v6.length > 2 ? `${v6.slice(0, 3).join(':')}:*` : '*'
}

export function maskEmail(email) {
  if (!email) return null
  const s = String(email)
  if (s.includes('*')) return s
  const at = s.indexOf('@')
  if (at < 1) return '***'
  return `${s[0]}***${s.slice(at)}`
}

export const SEV_LEVEL = { info: 'none', warning: 'warn', critical: 'bad' }

export const ORDER_STATUS_LABEL = {
  pending: 'Waiting for restaurant',
  requested: 'Requested',
  accepted: 'Accepted',
  confirmed: 'Confirmed',
  preparing: 'Preparing',
  ready: 'Ready',
  on_the_way: 'On the way',
  delivering: 'On the way',
  delivered: 'Delivered',
  completed: 'Completed',
  cancelled: 'Cancelled',
  declined: 'Declined',
  refunded: 'Refunded',
}

const FINAL = new Set(['delivered', 'completed', 'cancelled', 'declined', 'refunded'])

// Colour of an order's status pill: red = stopped, amber = waiting on the
// restaurant, green = moving, gray = done.
export function statusTone(s) {
  if (s === 'cancelled' || s === 'declined' || s === 'refunded') return status.bad
  if (s === 'pending' || s === 'requested') return status.warn
  if (FINAL.has(s)) return colors.pencil
  return status.ok
}
