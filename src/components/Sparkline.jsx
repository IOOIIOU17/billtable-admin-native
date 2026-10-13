import { memo } from 'react'
import Svg, { Path, Line, Circle } from 'react-native-svg'
import { colors } from '../styles/tokens'

// A tiny line of the last 2 minutes. The x axis is time, so a gap shows
// where data was missing instead of squashing it away. Right after the app
// connects there are only a few seconds of data: the window then shrinks
// to what there is (at least 20 s) so the line is readable straight away.
function Sparkline({ points, width = 64, height = 22, maxWindowMs = 120000, color = colors.ink }) {
  if (!points || points.length < 2) {
    return (
      <Svg width={width} height={height}>
        <Line x1="0" y1={height - 1} x2={width} y2={height - 1} stroke={colors.light} strokeWidth="1" />
      </Svg>
    )
  }
  const end = points[points.length - 1].t
  const windowMs = Math.min(maxWindowMs, Math.max(20000, end - points[0].t))
  const start = end - windowMs
  const max = Math.max(1, ...points.map((p) => p.v))
  const xy = points
    .filter((p) => p.t >= start)
    .map((p) => [((p.t - start) / windowMs) * (width - 3), height - 3 - (p.v / max) * (height - 6)])
  const d = xy.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const [lx, ly] = xy[xy.length - 1]
  return (
    <Svg width={width} height={height}>
      <Line x1="0" y1={height - 1} x2={width} y2={height - 1} stroke={colors.light} strokeWidth="1" />
      <Path d={d} fill="none" stroke={color} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
      <Circle cx={lx} cy={ly} r="2.2" fill={color} />
    </Svg>
  )
}

export default memo(Sparkline)
