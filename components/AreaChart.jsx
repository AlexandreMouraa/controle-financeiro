'use client'

import { useRef, useState, useLayoutEffect } from 'react'

// Mede a largura do container de forma robusta (ResizeObserver + fallback).
export function useWidth(initial = 600) {
  const ref = useRef(null)
  const [w, setW] = useState(initial)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => { const c = el.clientWidth; if (c > 0) setW(c) }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    window.addEventListener('resize', measure)
    const t = setTimeout(measure, 120)
    return () => { ro.disconnect(); window.removeEventListener('resize', measure); clearTimeout(t) }
  }, [])
  return [ref, w]
}

const fmtK = (n) => {
  if (Math.abs(n) >= 1000) return 'R$ ' + (n / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + 'k'
  return 'R$ ' + Math.round(n)
}

// Gráfico de área/linha. `series`: [{ key, color, data:[n], fill?:false }].
// `labels`: rótulos do eixo X (mesmo comprimento dos data).
export default function AreaChart({ series, labels, height = 220, fmt = fmtK }) {
  const [wrapRef, w] = useWidth()
  const padL = 46, padR = 12, padT = 14, padB = 26
  const innerW = Math.max(10, w - padL - padR)
  const innerH = height - padT - padB
  const all = series.flatMap((s) => s.data)
  const max = (Math.max(...all, 0) || 1) * 1.12
  const min = 0
  const n = labels.length
  const x = (i) => padL + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW)
  const y = (v) => padT + innerH - ((v - min) / (max - min || 1)) * innerH
  const ticks = 4

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
        {labels.map((l, i) => (
          <text key={l + i} x={x(i)} y={height - 8} textAnchor="middle" fontSize="11" fill="var(--muted)" fontWeight="600">{l}</text>
        ))}
        {series.map((s, si) => {
          const line = s.data.map((v, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(v).toFixed(1)).join(' ')
          const area = line + ` L${x(n - 1).toFixed(1)} ${y(0).toFixed(1)} L${x(0).toFixed(1)} ${y(0).toFixed(1)} Z`
          const gid = 'ac' + si
          return (
            <g key={s.key}>
              {s.fill !== false && (
                <>
                  <defs>
                    <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0" stopColor={s.color} stopOpacity="0.20" />
                      <stop offset="1" stopColor={s.color} stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d={area} fill={`url(#${gid})`} />
                </>
              )}
              <path d={line} fill="none" stroke={s.color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              {s.data.map((v, i) => (<circle key={i} cx={x(i)} cy={y(v)} r={i === n - 1 ? 4 : 3} fill={s.color} />))}
            </g>
          )
        })}
      </svg>
    </div>
  )
}
