'use client'

import { TrendingUp, TrendingDown, Wallet, Clock, AlertTriangle, BarChart3, Repeat } from 'lucide-react'
import { formatBRL, monthLabel, shiftMonth, spendByCategory, findCategory } from '@/lib/helpers'
import { CATEGORIES } from '@/lib/constants'
import AreaChart from '../AreaChart'
import BarChart from '../BarChart'
import KpiCard from '../KpiCard'

const DOWS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

export function PlanejamentoModule({ ctx }) {
  const { planning, currentMonth, isCurrentRealMonth, todayDay } = ctx
  const { daysInMonth, firstDow, events } = planning
  const today = isCurrentRealMonth ? todayDay : 0

  const evByDay = {}
  events.forEach((p) => { (evByDay[p.dia] = evByDay[p.dia] || []).push(p) })

  const cells = []
  for (let i = 0; i < firstDow; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const futuras = events.filter((p) => p.dia >= today).sort((a, b) => a.dia - b.dia)

  const despesas = events.filter((e) => e.tipo === 'despesa')
  const sum = (arr) => arr.reduce((s, e) => s + e.valor, 0)
  const aVencer = isCurrentRealMonth ? despesas.filter((e) => e.dia >= todayDay) : despesas
  const vencidas = isCurrentRealMonth ? despesas.filter((e) => e.dia < todayDay) : []
  const maior = despesas.reduce((m, e) => (!m || e.valor > m.valor ? e : m), null)

  return (
    <div className="page">
      <p className="page-intro">Contas a vencer, recebimentos e o fluxo previsto de <span style={{ textTransform: 'capitalize' }}>{monthLabel(currentMonth)}</span>.</p>

      <div className="kpi-grid cols-3">
        <KpiCard icon={Clock} tone="warn" label="A vencer" value={formatBRL(sum(aVencer))} sub={`${aVencer.length} ${aVencer.length === 1 ? 'conta' : 'contas'}${isCurrentRealMonth ? ' a partir de hoje' : ' no mês'}`} />
        <KpiCard icon={AlertTriangle} tone="debt" label="Já venceu" value={isCurrentRealMonth ? formatBRL(sum(vencidas)) : '—'} sub={isCurrentRealMonth ? `${vencidas.length} ${vencidas.length === 1 ? 'conta' : 'contas'} antes de hoje` : 'disponível só no mês atual'} delay={0.04} />
        <KpiCard icon={Wallet} label="Maior conta do mês" value={maior ? formatBRL(maior.valor) : '—'} sub={maior ? `${maior.desc} · dia ${maior.dia}` : 'nada no calendário'} delay={0.08} />
      </div>

      <div className="grid-2">
        <section className="card reveal" style={{ animationDelay: '.08s' }}>
          <div className="card-head">
            <div>
              <div className="card-title" style={{ textTransform: 'capitalize' }}>{monthLabel(currentMonth)}</div>
              <div className="card-sub">A renda principal não tem dia fixo e fica fora do calendário.</div>
            </div>
            <div className="chart-legend" style={{ gap: 14 }}>
              <span className="item"><span className="sw" style={{ background: 'var(--accent)' }} />Entra</span>
              <span className="item"><span className="sw" style={{ background: 'var(--debt)' }} />Sai</span>
            </div>
          </div>
          <div className="cal">
            {DOWS.map((d) => (<div className="dow" key={d}>{d}</div>))}
            {cells.map((d, i) => d === null
              ? <div className="cell empty" key={'e' + i} />
              : (
                <div className={'cell' + (d === today ? ' today' : '')} key={d}>
                  <span className="dn">{d}</span>
                  {(evByDay[d] || []).map((ev, j) => (<span className={'ev ' + ev.tipo} key={j} title={ev.desc + ' · ' + formatBRL(ev.valor)}>{ev.desc}</span>))}
                </div>
              ))}
          </div>
        </section>

        <section className="card reveal" style={{ animationDelay: '.12s' }}>
          <div className="card-head"><div className="eyebrow"><Clock size={13} /> Próximas obrigações</div></div>
          {futuras.length > 0 ? (
            <div className="rows">
              {futuras.map((p, i) => {
                const pos = p.tipo === 'receita'
                const col = pos ? 'var(--accent)' : 'var(--debt)'
                return (
                  <div className="row" key={i}>
                    <div className="main">
                      <span className="ic-cell" style={{ background: `color-mix(in oklab, ${col} 15%, transparent)`, color: col, fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600 }}>{String(p.dia).padStart(2, '0')}</span>
                      <div style={{ minWidth: 0 }}>
                        <div className="nm">{p.desc}</div>
                        <div className="tag"><span>dia {p.dia}</span><span className="sep">·</span><span>{p.cat}</span></div>
                      </div>
                    </div>
                    <div className={'amt ' + (pos ? 'pos' : 'neg')}>{pos ? '+ ' : '− '}{formatBRL(p.valor)}</div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="empty-box">Nada agendado a partir de hoje. Defina o dia de vencimento das despesas fixas para vê-las aqui.</div>
          )}
        </section>
      </div>
    </div>
  )
}

export function RelatoriosModule({ ctx }) {
  const { data, currentMonth, history, summary, expensesByCategory, allTransactions, activeRecurring } = ctx

  const prevKey = shiftMonth(currentMonth, -1)
  const prevSpend = spendByCategory(data, prevKey)
  const prevMonthName = monthLabel(prevKey).split(' de ')[0]

  const cats = CATEGORIES
    .map((c) => ({ ...c, cur: expensesByCategory[c.id] || 0, prev: prevSpend[c.id] || 0 }))
    .filter((c) => c.cur > 0 || c.prev > 0)
    .sort((a, b) => b.cur - a.cur)

  const topExpenses = [
    ...allTransactions.filter((t) => t.type === 'expense'),
    ...activeRecurring.map((r) => ({ ...r, fixa: true })),
  ].sort((a, b) => b.amount - a.amount).slice(0, 5)

  const fixas = summary.recurringTotal
  const variaveis = summary.variableExpensesTotal
  const totalGasto = fixas + variaveis
  const pctFixas = totalGasto ? Math.round((fixas / totalGasto) * 100) : 0

  return (
    <div className="page">
      <p className="page-intro">O que o resumo não mostra: comparação com o mês anterior, suas maiores despesas e o peso das contas fixas na sua renda.</p>

      <div className="cards-2">
        <section className="card reveal">
          <div className="card-head"><div className="card-title">Receita × Despesa</div><div className="card-sub">6 meses</div></div>
          <BarChart data={history} />
        </section>
        <section className="card reveal" style={{ animationDelay: '.05s' }}>
          <div className="card-head"><div className="card-title">Evolução do saldo</div><div className="card-sub">saldo mensal</div></div>
          <AreaChart labels={history.map((h) => h.label)} series={[{ key: 'saldo', color: 'var(--accent)', data: history.map((h) => h.saldo) }]} />
        </section>
      </div>

      <div className="grid-2">
        <section className="card reveal" style={{ animationDelay: '.1s' }}>
          <div className="card-head"><div className="eyebrow"><BarChart3 size={13} /> Categorias × mês anterior</div><div className="card-sub">vs. {prevMonthName}</div></div>
          {cats.length > 0 ? (
            <div>
              {cats.map((c) => {
                const diff = c.cur - c.prev
                const pct = c.prev > 0 ? Math.round((Math.abs(diff) / c.prev) * 100) : null
                const worse = diff > 0
                return (
                  <div className="cmp-row" key={c.id}>
                    <span className="cat-dot" style={{ background: c.color }} />
                    <span className="nm">{c.emoji} {c.label}</span>
                    {pct === null ? (
                      <span className="delta down">novo</span>
                    ) : pct === 0 ? (
                      <span className="stable">estável</span>
                    ) : (
                      <span className={'delta ' + (worse ? 'down' : 'up')}>{worse ? <TrendingUp size={11} /> : <TrendingDown size={11} />}{pct}%</span>
                    )}
                    <span className="vl">{formatBRL(c.cur)}</span>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="empty-box">Sem gastos neste mês nem no anterior.</div>
          )}
        </section>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <section className="card reveal" style={{ animationDelay: '.14s' }}>
            <div className="card-head"><div className="eyebrow"><TrendingDown size={13} /> Maiores despesas do mês</div></div>
            {topExpenses.length > 0 ? (
              <div className="rows">
                {topExpenses.map((t, i) => {
                  const cat = findCategory(t.category)
                  const col = cat?.color || '#8a8378'
                  return (
                    <div className="row" key={`${t.fixa ? 'f' : 'v'}-${t.id}`}>
                      <div className="main">
                        <span className="ic-cell" style={{ background: `color-mix(in oklab, ${col} 15%, transparent)`, color: col, fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600 }}>{i + 1}º</span>
                        <div style={{ minWidth: 0 }}>
                          <div className="nm">{t.description}</div>
                          <div className="tag"><span>{cat?.label || 'Outros'}</span><span className="sep">·</span><span>{t.fixa ? 'fixa' : 'variável'}</span></div>
                        </div>
                      </div>
                      <div className="amt neg">{formatBRL(t.amount)}</div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="empty-box">Nenhuma despesa neste mês.</div>
            )}
          </section>

          <section className="card reveal" style={{ animationDelay: '.18s' }}>
            <div className="card-head"><div className="eyebrow"><Repeat size={13} /> Fixas × variáveis</div></div>
            {totalGasto > 0 ? (
              <>
                <div className="split-bar"><span style={{ width: pctFixas + '%', background: 'var(--ink-soft)' }} /><span style={{ width: (100 - pctFixas) + '%', background: 'var(--debt)' }} /></div>
                <div className="cmp-row" style={{ marginTop: 10 }}>
                  <span className="cat-dot" style={{ background: 'var(--ink-soft)' }} />
                  <span className="nm">Fixas</span>
                  <span className="card-sub" style={{ margin: 0 }}>{pctFixas}%</span>
                  <span className="vl">{formatBRL(fixas)}</span>
                </div>
                <div className="cmp-row">
                  <span className="cat-dot" style={{ background: 'var(--debt)' }} />
                  <span className="nm">Variáveis</span>
                  <span className="card-sub" style={{ margin: 0 }}>{100 - pctFixas}%</span>
                  <span className="vl">{formatBRL(variaveis)}</span>
                </div>
              </>
            ) : (
              <div className="empty-box">Nenhuma despesa neste mês.</div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
