export default function DonutChart({ data, total, size = 156, thickness = 26 }) {
  const r = (size - thickness) / 2
  const c = 2 * Math.PI * r
  let acc = 0
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90 flex-shrink-0">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        strokeWidth={thickness}
        className="stroke-stone-100 dark:stroke-stone-800"
      />
      {data.map((d) => {
        const frac = total > 0 ? d.value / total : 0
        const dash = frac * c
        const seg = (
          <circle
            key={d.id}
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            strokeWidth={thickness}
            stroke={d.color}
            strokeDasharray={`${dash} ${c - dash}`}
            strokeDashoffset={-acc * c}
            style={{ transition: 'stroke-dasharray 0.6s ease, stroke-dashoffset 0.6s ease' }}
          />
        )
        acc += frac
        return seg
      })}
    </svg>
  )
}
