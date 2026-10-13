import { memo, useMemo } from 'react'
import { Text, StyleSheet } from 'react-native'
import { SketchView as View } from '../../src/components/Sketch'
import Screen from '../../src/components/Screen'
import Card from '../../src/components/Card'
import Light from '../../src/components/Light'
import Sparkline from '../../src/components/Sparkline'
import { LivePill, LiveStale } from '../../src/components/LiveStatus'
import useNow from '../../src/hooks/useNow'
import { useOps, CATEGORIES, BACKUP_JOBS } from '../../src/state/ops'
import {
  RULES, CATEGORY_LABEL, JOB_LABEL, fmt, ago, span, bytes, overall, worst,
  lvl5xx, lvl429, lvlInFlight, inFlightLimit, memPct, lvlMem, lvlLag, lvlCpu, lvlDb, lvlUptime, backupLevel,
} from '../../src/services/format'
import { colors, fonts, fontSize, spacing, status } from '../../src/styles/tokens'

export default function Health() {
  const s = useOps()
  const now = useNow(1000)
  const o = overall(s, now)
  const m = s.metrics
  const limit = inFlightLimit(s.limiter)

  return (
    <Screen title="Health" subtitle="The server, live (about twice a second)" right={<LivePill />}>
      <LiveStale />
      <Overall o={o} conn={s.conn} />
      <Traffic m={m} history={s.history} limit={limit} />
      <Server m={m} />
      <Backups backups={s.backups} now={now} />
    </Screen>
  )
}

// ---- the big light ---------------------------------------------------------
function Overall({ o, conn }) {
  const tone = status[o.level]
  const list = [...o.issues.problems, ...o.issues.watch]
  return (
    <View style={[styles.overall, { borderColor: tone, backgroundColor: status[`${o.level}Bg`] }]} testID="overall">
      <View style={styles.overallRow}>
        <Light level={o.level} size={34} />
        <Text style={[styles.sentence, { color: o.level === 'none' ? colors.ink : tone }]}>{o.sentence}</Text>
      </View>
      {!o.stale && list.length ? (
        <View style={styles.issues}>
          {list.slice(0, 6).map((i) => (
            <View key={i.key} style={styles.issue}>
              <Light level={i.level === 'problem' ? 'warn' : i.level} size={14} />
              <Text style={styles.issueText}>{i.text}</Text>
            </View>
          ))}
        </View>
      ) : null}
      {conn === 'polling' ? <Text style={styles.small}>The live feed is not working, so the app asks the server every 2 seconds instead.</Text> : null}
    </View>
  )
}

// ---- traffic ---------------------------------------------------------------
const Traffic = memo(function Traffic({ m, history, limit }) {
  const t = m?.totals || {}
  const light = m ? worst(lvl5xx(t.err5xxPerMin), lvl429(t.blocked429PerMin), lvlInFlight(m.inFlight, limit)) : 'none'
  const series = useMemo(() => {
    const out = {}
    for (const c of CATEGORIES) out[c] = history.map((h) => ({ t: h.t, v: h.cats[c]?.perMin ?? 0 }))
    out.__all = history.map((h) => ({ t: h.t, v: h.totals?.reqPerMin ?? 0 }))
    return out
  }, [history])
  const busy = CATEGORIES.filter((c) => {
    const x = m?.byCategory?.[c]
    return x && (x.perMin || x.inFlight || x.err5xxPerMin || x.blocked429PerMin)
  })
  const quiet = CATEGORIES.filter((c) => !busy.includes(c))

  return (
    <Card
      title="Traffic"
      light={light}
      hint={`"Now" is how many requests the server is working on this second (red at ${limit}). "/min" is requests in the last minute. "Slow" (p95) means 95 out of 100 requests were faster than this. "Errors" broke on our side (red at ${RULES.err5xxPerMin} a minute). "Blocked" were told to slow down — a few is normal, many (${RULES.blocked429PerMin}+) can mean an attack.`}
    >
      <View style={styles.totalRow}>
        <Cell label="now" value={fmt(m?.inFlight)} level={m ? lvlInFlight(m.inFlight, limit) : 'none'} />
        <Cell label="/min" value={fmt(t.reqPerMin)} />
        <Cell label="slow" value={t.p95Ms != null ? `${fmt(t.p95Ms)}ms` : '–'} />
        <Cell label="errors" value={fmt(t.err5xxPerMin)} level={m ? lvl5xx(t.err5xxPerMin) : 'none'} />
        <Cell label="blocked" value={fmt(t.blocked429PerMin)} level={m ? lvl429(t.blocked429PerMin) : 'none'} />
      </View>
      <View style={styles.sparkAll}>
        <Text style={styles.sparkLabel}>All requests, last 2 min</Text>
        <Sparkline points={series.__all} width={120} />
      </View>

      {busy.map((c) => {
        const x = m.byCategory[c]
        return (
          <View key={c} style={styles.catRow} testID={`cat-${c}`}>
            <View style={styles.catHead}>
              <Text style={styles.catName} numberOfLines={1}>{CATEGORY_LABEL[c]}</Text>
              <Sparkline points={series[c]} />
            </View>
            <View style={styles.catNums}>
              <Mini label="now" value={fmt(x.inFlight)} />
              <Mini label="/min" value={fmt(x.perMin)} />
              <Mini label="slow" value={x.p95Ms ? `${fmt(x.p95Ms)}ms` : '–'} />
              <Mini label="err" value={fmt(x.err5xxPerMin)} level={lvl5xx(x.err5xxPerMin)} />
              <Mini label="blocked" value={fmt(x.blocked429PerMin)} level={x.blocked429PerMin ? 'warn' : 'ok'} />
            </View>
          </View>
        )
      })}
      {quiet.length ? (
        <Text style={styles.quiet}>Quiet right now: {quiet.map((c) => CATEGORY_LABEL[c]).join(', ')}</Text>
      ) : null}
    </Card>
  )
})

function Cell({ label, value, level }) {
  const color = level && level !== 'ok' && level !== 'none' ? status[level] : colors.ink
  return (
    <View style={styles.cell}>
      <Text style={[styles.cellValue, { color }]} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      <Text style={styles.cellLabel}>{label}</Text>
    </View>
  )
}

function Mini({ label, value, level }) {
  const color = level && level !== 'ok' && level !== 'none' ? status[level] : colors.ink
  return (
    <View style={styles.mini}>
      <Text style={[styles.miniValue, { color }]} numberOfLines={1}>{value}</Text>
      <Text style={styles.miniLabel}>{label}</Text>
    </View>
  )
}

// ---- server ----------------------------------------------------------------
const Server = memo(function Server({ m }) {
  const mp = memPct(m)
  const db = m?.db || {}
  const items = [
    { k: 'cpu', label: 'CPU', value: m ? `${fmt(m.cpuPct)}%` : '–', level: lvlCpu(m?.cpuPct), sub: 'how busy the processor is' },
    { k: 'mem', label: 'Memory', value: mp == null ? '–' : `${fmt(mp)}%`, level: lvlMem(mp), sub: m ? `${fmt(m.memRssMb)} of ${fmt(m.memLimitMb)} MB` : '' },
    { k: 'heap', label: 'App memory', value: m ? `${fmt(m.heapUsedMb)} MB` : '–', level: m ? 'ok' : 'none', sub: 'JavaScript heap' },
    { k: 'lag', label: 'Response delay', value: m ? `${fmt(m.eventLoopLagMs)} ms` : '–', level: lvlLag(m?.eventLoopLagMs), sub: `red above ${RULES.eventLoopLagMs} ms` },
    { k: 'db', label: 'Database', value: m ? `${fmt((db.total ?? 0) - (db.idle ?? 0))}/${fmt(db.max)}` : '–', level: lvlDb(db), sub: m ? `in use · ${fmt(db.waiting)} waiting` : '' },
    { k: 'up', label: 'Up for', value: m ? span(m.uptimeSec) : '–', level: lvlUptime(m?.uptimeSec), sub: 'since the last restart' },
  ]
  return (
    <Card
      title="Server"
      light={m ? worst(...items.map((i) => i.level)) : 'none'}
      hint={`How hard the server computer is working. Memory turns red above ${RULES.memoryPct}% (it can crash when it runs out). "Response delay" is how long new work waits before the server can start it. "Database" is connections in use; "waiting" means requests are queueing for the database (red at ${RULES.dbWaiting}).`}
    >
      <View style={styles.grid}>
        {items.map((i) => (
          <View key={i.k} style={styles.stat} testID={`stat-${i.k}`}>
            <View style={styles.statHead}>
              <Light level={i.level} size={13} />
              <Text style={styles.statLabel} numberOfLines={1}>{i.label}</Text>
            </View>
            <Text style={[styles.statValue, i.level === 'bad' || i.level === 'warn' ? { color: status[i.level] } : null]} numberOfLines={1} adjustsFontSizeToFit>{i.value}</Text>
            <Text style={styles.statSub} numberOfLines={1}>{i.sub}</Text>
          </View>
        ))}
      </View>
    </Card>
  )
})

// ---- backups ---------------------------------------------------------------
function Backups({ backups, now }) {
  const levels = BACKUP_JOBS.map((j) => backupLevel(backups[j], j, now))
  return (
    <Card
      title="Backups"
      light={worst(...levels)}
      hint={`Your safety copies. Each job reports in when it finishes. Red means it failed, or has not worked for too long (database: ${RULES.backupStaleH} h, Mac copy: ${RULES.macStaleH} h, restore test: ${RULES.drillStaleDays} days). "Never" means the job has not reported yet — normal until it is installed.`}
    >
      {BACKUP_JOBS.map((job, i) => {
        const b = backups[job]
        const lv = levels[i]
        const [label, what] = JOB_LABEL[job]
        let line
        if (!b || b.lastStatus === 'never') line = 'Never reported'
        else if (b.lastStatus === 'fail') line = `FAILED ${ago(b.lastAt, now)}`
        else line = `Last good ${ago(b.lastOkAt, now)}`
        return (
          <View key={job} style={[styles.backup, i ? styles.backupSep : null]} testID={`backup-${job}`}>
            <View style={styles.backupHead}>
              <Light level={lv} size={16} />
              <Text style={styles.backupName}>{label}</Text>
            </View>
            <Text style={[styles.backupLine, lv === 'bad' ? { color: status.bad } : null]}>{line}{b?.stale && b.lastStatus !== 'never' ? ' · LATE' : ''}</Text>
            <Text style={styles.backupMeta}>
              {what}
              {b?.sizeBytes ? ` · ${bytes(b.sizeBytes)}` : ''}
              {b?.durationSec ? ` · took ${span(b.durationSec)}` : ''}
            </Text>
            {b?.detail ? <Text style={styles.backupMeta} numberOfLines={2}>“{b.detail}”</Text> : null}
          </View>
        )
      })}
    </Card>
  )
}

const styles = StyleSheet.create({
  overall: { borderWidth: 2.5, borderRadius: 18, padding: spacing.sm, marginBottom: spacing.sm },
  overallRow: { flexDirection: 'row', alignItems: 'center' },
  sentence: { flex: 1, fontFamily: fonts.logo, fontSize: 28, lineHeight: 32, marginLeft: 12 },
  issues: { marginTop: spacing.xs },
  issue: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  issueText: { fontFamily: fonts.body, fontSize: fontSize.md, color: colors.ink, marginLeft: 8, flex: 1 },
  small: { fontFamily: fonts.hint, fontSize: fontSize.xs, color: colors.pencil, marginTop: spacing.xs },

  totalRow: { flexDirection: 'row', justifyContent: 'space-between' },
  cell: { flex: 1, alignItems: 'center' },
  cellValue: { fontFamily: fonts.body, fontSize: 22, lineHeight: 26 },
  cellLabel: { fontFamily: fonts.hint, fontSize: 11, color: colors.pencil },
  sparkAll: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6, marginBottom: 4 },
  sparkLabel: { fontFamily: fonts.hint, fontSize: 11, color: colors.pencil },

  catRow: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.light, paddingTop: 6, marginTop: 6 },
  catHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  catName: { fontFamily: fonts.body, fontSize: fontSize.md, color: colors.ink, flex: 1, marginRight: 8 },
  catNums: { flexDirection: 'row', marginTop: 2 },
  mini: { flex: 1 },
  miniValue: { fontFamily: fonts.body, fontSize: 14 },
  miniLabel: { fontFamily: fonts.hint, fontSize: 10, color: colors.pencil, marginTop: -3 },
  quiet: { fontFamily: fonts.hint, fontSize: 11, color: colors.pencil, marginTop: 8 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 },
  stat: { width: '50%', paddingHorizontal: 4, paddingVertical: 6 },
  statHead: { flexDirection: 'row', alignItems: 'center' },
  statLabel: { fontFamily: fonts.hint, fontSize: 12, color: colors.pencil, marginLeft: 6, flex: 1 },
  statValue: { fontFamily: fonts.body, fontSize: 22, color: colors.ink, lineHeight: 26 },
  statSub: { fontFamily: fonts.hint, fontSize: 10, color: colors.pencil },

  backup: { paddingVertical: 6 },
  backupSep: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.light },
  backupHead: { flexDirection: 'row', alignItems: 'center' },
  backupName: { fontFamily: fonts.body, fontSize: fontSize.md, color: colors.ink, marginLeft: 8 },
  backupLine: { fontFamily: fonts.body, fontSize: 14, color: colors.ink, marginTop: 2 },
  backupMeta: { fontFamily: fonts.hint, fontSize: 11, color: colors.pencil },
})
