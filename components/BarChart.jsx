'use client'

import { useWidth } from './AreaChart'

const fmtK = (n) => {
  if (Math.abs(n) >= 1000) return 'R$ ' + (n / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + 'k'
  return 'R$ ' + Math.round(n)
}

// Barras agrupadas receita × despesa. `data`: [{ label, receita, despesa }].
export default function BarChart({ data, height = 220, fmt = fmtK }) {
  const [wrapRef, w] = useWidth()
  const padL = 46, padR = 12, padT = 14, padB = 26
  const innerW = Math.max(10, w - padL - padR)
  const innerH = height - padT - padB
  const max = (Math.max(...data.flatMap((h) => [h.receita, h.despesa]), 0) || 1) * 1.12
  const y = (v) => padT + innerH - (v / max) * innerH
  const n = data.length
  const slot = innerW / n
  const bw = Math.min(20, slot * 0.3)
  const ticks = 4
  const rec = 'var(--accent)', des = 'var(--debt)'

  return (
    <div className="chart-wrap" ref={wrapRef}>
      <svg width={w} height={height} style={{ display: 'block' }} focusable="false" aria-hidden="true">
        {Array.from({ length: ticks + 1 }).map((_, i) => {
          const v = (max / ticks) * i, yy = y(v)
          return (
            <g key={i}>
              <line x1={padL} y1={yy} x2={w - padR} y2={yy} stroke="var(--line-soft)" strokeWidth="1" />
              <text x={padL - 8} y={yy + 3.5} textAnchor="end" fontSize="10.5" fill="var(--faint)" fontFamily="var(--font-mono)">{fmt(v)}</text>
            </g>
          )
        })}
        {data.map((h, i) => {
          const cx = padL + slot * i + slot / 2
          return (
            <g key={h.label + i}>
              <rect x={cx - bw - 2} y={y(h.receita)} width={bw} height={padT + innerH - y(h.receita)} rx="3" fill={rec} />
              <rect x={cx + 2} y={y(h.despesa)} width={bw} height={padT + innerH - y(h.despesa)} rx="3" fill={des} />
              <text x={cx} y={height - 8} textAnchor="middle" fontSize="11" fill="var(--muted)" fontWeight="600">{h.label}</text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
