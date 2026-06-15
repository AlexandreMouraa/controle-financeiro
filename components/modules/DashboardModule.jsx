'use client'

import { useState } from 'react'
import { TrendingUp, TrendingDown, Lightbulb, AlertTriangle, BarChart3, ArrowLeftRight, CalendarClock, X } from 'lucide-react'
import { formatBRL, findCategory } from '@/lib/helpers'
import AreaChart from '../AreaChart'
import DonutChart from '../DonutChart'
import CategoryIcon from '../CategoryIcon'

export default function DashboardModule({ ctx }) {
  const { summary, prevSummary, history, chartData, insights, allTransactions, recurringTotal, activeRecurring, currentMonth, isCurrentRealMonth, todayDay, go } = ctx
  const M = summary
  const recent = allTransactions.slice(0, 6)
  const [dismissed, setDismissed] = useState(false)
  const [untilDate, setUntilDate] = useState('')

  // próximas contas a pagar — despesas fixas; sem dia de vencimento conta como dia 1
  const today = isCurrentRealMonth ? todayDay : 1
  const [yy, mm] = currentMonth.split('-').map(Number)
  const daysInMonth = new Date(yy, mm, 0).getDate()
  const monthStart = `${currentMonth}-01`
  const monthEnd = `${currentMonth}-${String(daysInMonth).padStart(2, '0')}`

  const bills = activeRecurring.map((r) => {
    const cat = findCategory(r.category)
    return { id: r.id, desc: r.description, valor: r.amount, cat: cat?.label || 'Outros', dia: r.dueDay || 1, hasDate: !!r.dueDay }
  }).sort((a, b) => a.dia - b.dia)

  const upcoming = bills.filter((b) => b.dia >= today)
  const nextBill = upcoming[0] || null
  const restBills = bills.filter((b) => b !== nextBill).slice(0, 6)

  const totalAgora = upcoming.reduce((s, b) => s + b.valor, 0)
  const totalMensal = bills.reduce((s, b) => s + b.valor, 0)
  const untilDay = untilDate && untilDate.slice(0, 7) === currentMonth ? Number(untilDate.slice(8, 10)) : null
  const totalAteData = untilDay != null ? bills.filter((b) => b.dia <= untilDay).reduce((s, b) => s + b.valor, 0) : null

  const deltaSaldo = M.balance - prevSummary.balance
  const stats = [
    { lab: 'Entradas', val: M.totalIncome, delta: M.totalIncome - prevSummary.totalIncome },
    { lab: 'Saídas', val: M.totalExpenses, delta: M.totalExpenses - prevSummary.totalExpenses, invert: true },
    { lab: 'Despesas fixas', val: recurringTotal, note: `${activeRecurring.length} ${activeRecurring.length === 1 ? 'conta ativa' : 'contas ativas'}`, go: 'fixas' },
  ]

  // um único insight — o mais relevante
  const insight = insights[0]
  const insightCls = { good: 'good', warn: 'warn', bad: 'risk' }
  const InsightIcon = insight ? (insight.tone === 'good' ? Lightbulb : AlertTriangle) : null

  return (
    <div className="page reveal">
      {/* resumo do mês — um cartão só */}
      <section className="card hero">
        <div className="hero-main">
          <div className="lab">Saldo atual</div>
          <div className="big">{formatBRL(M.balance)}</div>
          <div className="sub">
            <span className={'delta ' + (deltaSaldo >= 0 ? 'up' : 'down')}>
              {deltaSaldo >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}{formatBRL(Math.abs(deltaSaldo))}
            </span>
            <span>vs. mês anterior</span>
          </div>
        </div>
        <div className="hero-stats">
          {stats.map((s) => {
            const up = (s.delta || 0) >= 0
            const good = s.invert ? !up : up
            return (
              <div className={'hstat' + (s.go ? ' link' : '')} key={s.lab} onClick={s.go ? () => go(s.go) : undefined} role={s.go ? 'button' : undefined}>
                <div className="lab">{s.lab}</div>
                <div className="v">{formatBRL(s.val)}</div>
                <div className="note">
                  {s.delta !== undefined
                    ? <span className={'delta ' + (good ? 'up' : 'down')}>{up ? <TrendingUp size={10} /> : <TrendingDown size={10} />}{formatBRL(Math.abs(s.delta))}</span>
                    : <span>{s.note}</span>}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* um único insight, dispensável */}
      {insight && !dismissed && (
        <div className={'insight ' + (insightCls[insight.tone] || 'good')}>
          <span className="ic"><InsightIcon size={15} /></span>
          <span className="txt">{insight.text}</span>
          <button className="x" onClick={() => setDismissed(true)} title="Dispensar"><X size={13} /></button>
        </div>
      )}

      {/* evolução */}
      <section className="card reveal" style={{ animationDelay: '.1s' }}>
        <div className="card-head">
          <div>
            <div className="card-title">Evolução financeira</div>
            <div className="card-sub">Entradas, saídas e saldo dos últimos 6 meses</div>
          </div>
          <div className="chart-legend">
            <span className="item"><span className="sw" style={{ background: 'var(--accent)' }} />Entradas</span>
            <span className="item"><span className="sw" style={{ background: 'var(--debt)' }} />Saídas</span>
            <span className="item"><span className="sw" style={{ background: 'var(--ink-soft)' }} />Saldo</span>
          </div>
        </div>
        <AreaChart
          labels={history.map((h) => h.label)}
          series={[
            { key: 'receita', color: 'var(--accent)', data: history.map((h) => h.receita) },
            { key: 'despesa', color: 'var(--debt)', data: history.map((h) => h.despesa) },
            { key: 'saldo', color: 'var(--ink-soft)', fill: false, data: history.map((h) => h.saldo) },
          ]}
        />
      </section>

      {/* categorias + próximas contas a pagar */}
      <div className="grid-2">
        <section className="card reveal" style={{ animationDelay: '.14s' }}>
          <div className="card-head">
            <div className="eyebrow"><BarChart3 size={13} /> Gastos por categoria</div>
            <button className="linkbtn muted" onClick={() => go('relatorios')}>Ver relatórios</button>
          </div>
          {chartData.length > 0 ? (
            <div className="donut-wrap">
              <DonutChart data={chartData} total={M.totalExpenses} />
              <div className="legend">
                {chartData.map((s) => (
                  <div className="legend-row" key={s.id}>
                    <span className="sw" style={{ background: s.color }} />
                    <span className="nm"><CategoryIcon id={s.id} size={15} color={s.color} /> {s.label}</span>
                    <span className="pc">{Math.round((s.value / M.totalExpenses) * 100)}%</span>
                    <span className="vl">{formatBRL(s.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="empty-box">Nenhuma despesa neste mês ainda.</div>
          )}
        </section>

        <section className="card reveal" style={{ animationDelay: '.18s' }}>
          <div className="card-head">
            <div className="eyebrow"><CalendarClock size={13} /> Próximas contas a pagar</div>
            <button className="linkbtn muted" onClick={() => go('planejamento')}>Planejamento</button>
          </div>
          {bills.length > 0 ? (
            <>
              {nextBill && (() => {
                const diff = nextBill.dia - todayDay
                let due = `vence dia ${String(nextBill.dia).padStart(2, '0')}`
                let tone = ''
                if (!nextBill.hasDate) { due = 'sem dia definido · tratada como dia 01'; tone = 'muted' }
                else if (isCurrentRealMonth && diff === 0) { due = 'vence hoje'; tone = 'warn' }
                else if (isCurrentRealMonth && diff > 0 && diff <= 5) { due = `vence em ${diff} ${diff === 1 ? 'dia' : 'dias'}`; tone = 'warn' }
                return (
                  <div className={'bills-next' + (tone ? ' ' + tone : '')}>
                    <span className="day">{String(nextBill.dia).padStart(2, '0')}</span>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div className="nm">{nextBill.desc}</div>
                      <div className="due">{due} · {nextBill.cat}</div>
                    </div>
                    <span className="amt">{formatBRL(nextBill.valor)}</span>
                  </div>
                )
              })()}
              {restBills.length > 0 && (
                <div className="bills-rest">
                  {restBills.map((b) => (
                    <div className="bill-mini" key={b.id}>
                      <span className="day">{String(b.dia).padStart(2, '0')}</span>
                      <span className="nm">{b.desc}</span>
                      <span className="amt">{formatBRL(b.valor)}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="bills-totals">
                <div className="t">
                  <div className="l">A vencer agora</div>
                  <div className="v">{formatBRL(totalAgora)}</div>
                </div>
                <div className="t">
                  <div className="l">Total mensal</div>
                  <div className="v">{formatBRL(totalMensal)}</div>
                </div>
                <div className="t">
                  <input type="date" className="until" value={untilDate} min={monthStart} max={monthEnd} title="Total até esta data" onChange={(e) => setUntilDate(e.target.value)} />
                  <div className="v">{totalAteData != null ? formatBRL(totalAteData) : '—'}</div>
                </div>
              </div>
            </>
          ) : (
            <div className="empty-box">Nenhuma despesa fixa cadastrada. Adicione em Despesas fixas para acompanhar o que pagar aqui.</div>
          )}
        </section>
      </div>

      {/* últimas movimentações (histórico) */}
      <section className="card reveal" style={{ animationDelay: '.22s' }}>
        <div className="card-head">
          <div className="eyebrow"><ArrowLeftRight size={13} /> Últimas movimentações</div>
          <button className="linkbtn muted" onClick={() => go('transacoes')}>Ver todas</button>
        </div>
        {recent.length > 0 ? (
          <div className="rows">
            {recent.map((t) => {
              const pos = t.type === 'extra'
              const cat = findCategory(t.category)
              const col = pos ? 'var(--accent)' : (cat?.color || '#8a8378')
              return (
                <div className="row" key={`${t.type}-${t.id}`}>
                  <div className="main">
                    <span className="ic-cell" style={{ background: `color-mix(in oklab, ${col} 15%, transparent)`, color: col }}>{pos ? <TrendingUp size={14} /> : <TrendingDown size={14} />}</span>
                    <div style={{ minWidth: 0 }}>
                      <div className="nm">{t.description}</div>
                      <div className="tag">
                        <span>{new Date(t.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</span>
                        <span className="sep">·</span>
                        <span>{pos ? 'ganho extra' : (cat?.label || 'Outros')}</span>
                      </div>
                    </div>
                  </div>
                  <div className={'amt ' + (pos ? 'pos' : 'neg')}>{pos ? '+ ' : '− '}{formatBRL(t.amount)}</div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="empty-box">Sem movimentações neste mês. Use o botão + para lançar.</div>
        )}
      </section>
    </div>
  )
}
