'use client'

import { CreditCard, Check, Clock, PiggyBank, Target, Calendar, Shield, Plus, Pencil, Trash2 } from 'lucide-react'
import { formatBRL, monthLabel } from '@/lib/helpers'
import ProgressRing from '../ProgressRing'
import KpiCard from '../KpiCard'

export function DividasModule({ ctx }) {
  const { debts, isCurrentRealMonth, todayDay } = ctx
  const ativas = debts.filter((d) => !d.quitada)
  const totalRestante = debts.reduce((s, d) => s + d.restante, 0)
  const totalPago = debts.reduce((s, d) => s + d.pago, 0)
  const totalGeral = debts.reduce((s, d) => s + d.total, 0)
  const pctGeral = totalGeral ? Math.round((totalPago / totalGeral) * 100) : 0

  const proximo = ativas
    .filter((d) => d.dueDay)
    .filter((d) => !isCurrentRealMonth || d.dueDay >= todayDay)
    .sort((a, b) => a.dueDay - b.dueDay)[0]

  if (debts.length === 0) {
    return (
      <div className="page">
        <p className="page-intro">Acompanhe seus parcelamentos e quanto falta para quitar cada um.</p>
        <div className="empty-box" style={{ marginTop: 0 }}>Nenhuma dívida parcelada cadastrada. Ao lançar uma despesa fixa ou variável marcada como <b>parcelada</b> (ex.: carro, perfume, eletrônico), ela aparece aqui com o progresso de quitação.</div>
      </div>
    )
  }

  return (
    <div className="page">
      <p className="page-intro">Acompanhe seus parcelamentos e quanto falta para quitar cada um. {ativas.length} dívida(s) em aberto.</p>

      <div className="kpi-grid cols-3">
        <KpiCard icon={CreditCard} tone="debt" label="Saldo devedor" value={formatBRL(totalRestante)} sub={`de ${formatBRL(totalGeral)} no total`} />
        <KpiCard icon={Check} label="Já quitado" value={formatBRL(totalPago)} sub={`${pctGeral}% do total`} delay={0.04} />
        <KpiCard icon={Clock} tone="warn" small label="Próximo vencimento" value={proximo ? `dia ${proximo.dueDay}` : '—'} sub={proximo ? `${proximo.nome} · ${formatBRL(proximo.amount)}` : 'sem vencimento definido'} delay={0.08} />
      </div>

      <div className="cards-2">
        {debts.map((d, i) => {
          const pct = Math.round((d.pago / d.total) * 100)
          return (
            <div className="pcard reveal" key={d.id} style={{ animationDelay: i * 0.05 + 's' }}>
              <div className="ph">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                  <span style={{ width: 38, height: 38, borderRadius: 10, background: d.cor, flexShrink: 0, display: 'grid', placeItems: 'center', color: '#fff' }}><CreditCard size={18} /></span>
                  <div style={{ minWidth: 0 }}>
                    <div className="nm">{d.nome}</div>
                    <div className="sub">
                      {d.quitada
                        ? <span style={{ color: 'var(--accent-ink)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}><Check size={12} />Quitada</span>
                        : <>{d.dueDay ? <>Vence dia {d.dueDay}<span style={{ color: 'var(--faint)' }}>·</span></> : null}{d.parcelasPagas}/{d.parcelasTotal} parcelas</>}
                    </div>
                  </div>
                </div>
                <div className="pct-big" style={{ color: d.quitada ? 'var(--accent-ink)' : 'var(--ink)' }}>{pct}%</div>
              </div>
              <div className="pbar"><span style={{ width: pct + '%', background: d.quitada ? 'var(--accent)' : d.cor }} /></div>
              <div className="figs">
                <div><div className="l">Pago</div><div className="v" style={{ color: 'var(--accent-ink)' }}>{formatBRL(d.pago)}</div></div>
                <div style={{ textAlign: 'center' }}><div className="l">Total</div><div className="v">{formatBRL(d.total)}</div></div>
                <div style={{ textAlign: 'right' }}><div className="l">Restante</div><div className="v" style={{ color: d.quitada ? 'var(--muted)' : 'var(--debt)' }}>{formatBRL(d.restante)}</div></div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Card de objetivo (meta de poupança / reserva de emergência). Com `progress`
// mostra anel, barra, valores e ações; sem, mostra o CTA de criação (e a dica
// de `emptyHint`, se houver).
function GoalCard({ title, sub, progress, figs, onEdit, onRemove, onCreate, emptyLabel, emptyHint, delay }) {
  const filled = progress != null
  return (
    <div className="pcard reveal" style={delay ? { animationDelay: delay + 's' } : undefined}>
      <div className="ph">
        <div style={{ minWidth: 0 }}>
          <div className="nm">{title}</div>
          <div className="sub">{sub}</div>
        </div>
        {filled && <ProgressRing progress={progress} size={62} stroke={6} />}
      </div>
      {filled ? (
        <>
          <div className="pbar"><span style={{ width: Math.round(progress * 100) + '%', background: 'var(--accent)' }} /></div>
          <div className="figs">
            {figs.map((f, i) => (
              <div key={f.l} style={i === 0 ? undefined : { textAlign: i === figs.length - 1 ? 'right' : 'center' }}>
                <div className="l">{f.l}</div>
                <div className="v" style={f.color ? { color: f.color } : undefined}>{f.v}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 14 }}>
            <button className="linkbtn" onClick={onEdit}><Pencil size={12} /> Editar</button>
            <button className="linkbtn danger" onClick={onRemove}><Trash2 size={12} /> Excluir</button>
          </div>
        </>
      ) : (
        <>
          {emptyHint && <div className="empty-box" style={{ marginTop: 0, marginBottom: 14 }}>{emptyHint}</div>}
          <button className="btn-ghost" style={{ width: '100%', justifyContent: 'center' }} onClick={onCreate}><Plus size={14} /> {emptyLabel}</button>
        </>
      )}
    </div>
  )
}

export function MetasModule({ ctx }) {
  const { goalInfo, reserveInfo, recurringTotal, openModal, removeGoal, removeReserve, askConfirm } = ctx

  const totalAtual = (goalInfo?.saved || 0) + (reserveInfo?.currentAmount || 0)
  const totalAlvo = (goalInfo?.totalAmount || 0) + (reserveInfo?.target || 0)
  const progressoGeral = totalAlvo ? Math.round((totalAtual / totalAlvo) * 100) : 0
  const conclusao = goalInfo ? monthLabel(goalInfo.endMonth).replace(' de ', ' ') : null

  return (
    <div className="page">
      <p className="page-intro">Defina objetivos e acompanhe o quanto já guardou para cada um.</p>

      <div className="kpi-grid cols-3">
        <KpiCard icon={PiggyBank} label="Total guardado" value={formatBRL(totalAtual)} sub={`de ${formatBRL(totalAlvo)} planejados`} />
        <KpiCard icon={Target} label="Progresso geral" value={progressoGeral + '%'} sub="do conjunto de metas" delay={0.04} />
        <KpiCard icon={Clock} tone="warn" small label="Conclusão da meta" value={conclusao ? conclusao.charAt(0).toUpperCase() + conclusao.slice(1) : '—'} sub={goalInfo ? 'meta de poupança' : 'sem meta definida'} delay={0.08} />
      </div>

      <div className="cards-2">
        <GoalCard
          title="Meta de poupança"
          sub={goalInfo ? <><Calendar size={12} />Termina em <span style={{ textTransform: 'capitalize' }}>{monthLabel(goalInfo.endMonth)}</span></> : 'Junte o que sobra todo mês'}
          progress={goalInfo ? goalInfo.progress : null}
          figs={goalInfo ? [
            { l: 'Guardado', v: formatBRL(goalInfo.saved), color: 'var(--accent-ink)' },
            { l: 'Alvo', v: formatBRL(goalInfo.totalAmount) },
            { l: 'Falta', v: formatBRL(goalInfo.remainingAmount) },
          ] : null}
          onEdit={() => openModal('goal')}
          onRemove={() => askConfirm('Excluir a meta de poupança?', 'Excluir').then((ok) => { if (ok) removeGoal() })}
          onCreate={() => openModal('goal')}
          emptyLabel="Definir meta"
        />
        <GoalCard
          title="Reserva de emergência"
          sub={reserveInfo ? <><Shield size={12} />{reserveInfo.targetMonths} {reserveInfo.targetMonths === 1 ? 'mês' : 'meses'} de fixas</> : 'Colchão para imprevistos'}
          progress={reserveInfo ? reserveInfo.progress : null}
          figs={reserveInfo ? [
            { l: 'Guardado', v: formatBRL(reserveInfo.currentAmount), color: 'var(--accent-ink)' },
            { l: 'Alvo', v: formatBRL(reserveInfo.target) },
            { l: 'Falta', v: formatBRL(reserveInfo.remaining) },
          ] : null}
          onEdit={() => openModal('reserve')}
          onRemove={() => askConfirm('Excluir a reserva de emergência?', 'Excluir').then((ok) => { if (ok) removeReserve() })}
          onCreate={() => openModal('reserve')}
          emptyLabel="Definir reserva"
          emptyHint={recurringTotal > 0 ? `Com ${formatBRL(recurringTotal)}/mês de despesas fixas, uma reserva de 3 meses seria ~${formatBRL(recurringTotal * 3)}.` : null}
          delay={0.05}
        />
      </div>
    </div>
  )
}
