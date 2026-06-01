// Anel de progresso editorial. `progress` 0..1. Inclui o rótulo de % no centro.
export default function ProgressRing({ progress, size = 60, stroke = 5 }) {
  const r = size / 2 - stroke
  const c = 2 * Math.PI * r
  const clamped = Math.min(Math.max(progress || 0, 0), 1)
  const offset = c * (1 - clamped)
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line-soft)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset .7s ease' }}
        />
      </svg>
      <div className="pc">{Math.round(clamped * 100)}%</div>
    </div>
  )
}
