import { formatBRL } from '@/lib/helpers'

export default function DonutChart({ data, total, size = 148 }) {
  const r = size / 2 - 9
  const cx = size / 2
  const cy = size / 2
  const c = 2 * Math.PI * r
  let acc = 0

  return (
    <div className="donut" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--line-soft)" strokeWidth="11" />
        {data.map((d) => {
          const frac = total > 0 ? d.value / total : 0
          const dash = frac * c
          const seg = (
            <circle
              key={d.id}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={d.color}
              strokeWidth="11"
              strokeDasharray={`${dash} ${c - dash}`}
              strokeDashoffset={-acc * c}
              strokeLinecap="butt"
              transform={`rotate(-90 ${cx} ${cy})`}
              style={{ transition: 'stroke-dasharray .6s ease, stroke-dashoffset .6s ease' }}
            />
          )
          acc += frac
          return seg
        })}
      </svg>
      <div className="center">
        <div className="t">Total</div>
        <div className="v">{formatBRL(total)}</div>
      </div>
    </div>
  )
}
