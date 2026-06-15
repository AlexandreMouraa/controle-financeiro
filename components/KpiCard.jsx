'use client'

import { TrendingUp, TrendingDown } from 'lucide-react'
import { formatBRL } from '@/lib/helpers'

const TONES = {
  accent: { bg: 'var(--accent-bg)', color: 'var(--accent)' },
  debt: { bg: 'var(--debt-bg)', color: 'var(--debt)' },
  warn: { bg: 'var(--warn-bg)', color: 'var(--warn)' },
}

// Card de indicador usado em todas as páginas. Com `delta` mostra o chip de
// variação vs. mês anterior (invert = subir é ruim, ex. despesas); sem delta
// mostra o texto de `sub`. `small` reduz o valor (datas, nomes, "dia 12").
export default function KpiCard({ icon: Icon, label, value, sub, tone = 'accent', small, delta, invert, delay = 0 }) {
  const { bg, color } = TONES[tone] || TONES.accent
  const up = (delta || 0) >= 0
  const good = invert ? !up : up

  return (
    <div className="kpi reveal" style={delay ? { animationDelay: delay + 's' } : undefined}>
      <div className="top">
        <span className="ic" style={{ background: bg, color }}><Icon size={17} /></span>
        <span className="lab">{label}</span>
      </div>
      <div className={'val' + (small ? ' sm' : '')}>{value}</div>
      <div className="sub">
        {delta !== undefined ? (
          <>
            <span className={'delta ' + (good ? 'up' : 'down')}>
              {up ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
              {formatBRL(Math.abs(delta))}
            </span>
            <span>vs. mês anterior</span>
          </>
        ) : (
          <span>{sub}</span>
        )}
      </div>
    </div>
  )
}
