'use client'

import { Plus, Repeat, Pencil, Trash2 } from 'lucide-react'
import { formatBRL, findCategory, findCard, getInstallmentInfo } from '@/lib/helpers'

export default function FixasModule({ ctx }) {
  const {
    data, summary, activeRecurring, disabledIds, recurringTotal, currentMonth,
    isCurrentRealMonth, todayDay, openModal, setEditingRecurring,
    toggleRecurringForMonth, removeRecurring, askConfirm,
  } = ctx

  const renda = summary.mainIncome
  const pctRenda = renda ? Math.round((recurringTotal / renda) * 100) : 0
  const proximo = [...activeRecurring]
    .filter((r) => r.dueDay)
    .sort((a, b) => a.dueDay - b.dueDay)[0]

  return (
    <div className="page reveal">
      {/* resumo das fixas — hero */}
      <section className="card hero">
        <div className="hero-main">
          <div className="lab">Total fixo mensal</div>
          <div className="big">{formatBRL(recurringTotal)}</div>
          <div className="sub"><span>{activeRecurring.length} de {data.recurring.length} ativas neste mês</span></div>
        </div>
        <div className="hero-stats" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
          <div className="hstat">
            <div className="lab">% da renda comprometida</div>
            <div className="v">{pctRenda}%</div>
            <div className="note">{renda ? `sobre ${formatBRL(renda)}` : 'defina sua renda'}</div>
          </div>
          <div className="hstat">
            <div className="lab">Próximo débito</div>
            <div className="v">{proximo ? `dia ${String(proximo.dueDay).padStart(2, '0')}` : '—'}</div>
            <div className="note">{proximo ? proximo.description : 'sem dia definido'}</div>
          </div>
        </div>
      </section>

      <section className="card reveal" style={{ animationDelay: '.06s' }}>
        <div className="card-head">
          <div className="eyebrow"><Repeat size={13} /> Contas recorrentes</div>
          <button className="btn-ghost sm" onClick={() => openModal('recurring')}><Plus size={14} /> Adicionar fixa</button>
        </div>
        {data.recurring.length > 0 ? (
          <div className="rows">
            {data.recurring.map((r) => {
              const cat = findCategory(r.category)
              const col = cat?.color || '#8a8378'
              const card = r.cardId ? findCard(r.cardId) : null
              const off = disabledIds.includes(r.id)
              const installInfo = getInstallmentInfo(r, currentMonth)
              let dueTxt = null, dueCls = ''
              if (r.dueDay) {
                const live = isCurrentRealMonth && !off
                const diff = r.dueDay - todayDay
                if (live && diff < 0) { dueTxt = `venceu dia ${r.dueDay}`; dueCls = 'debt' }
                else if (live && diff === 0) { dueTxt = 'vence hoje'; dueCls = 'warn' }
                else if (live && diff <= 5) { dueTxt = `vence em ${diff} ${diff === 1 ? 'dia' : 'dias'}`; dueCls = 'warn' }
                else dueTxt = `vence dia ${r.dueDay}`
              }
              return (
                <div className={'row' + (off ? ' off' : '')} key={r.id}>
                  <div className="main">
                    <span className="ic-cell" style={{ background: `color-mix(in oklab, ${col} 16%, transparent)`, color: col }}>
                      <span className="cat-dot" style={{ background: col }} />
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <div className={'nm' + (off ? ' off-text' : '')}>{r.description}</div>
                      <div className="tag">
                        <span>{cat?.label || 'Outros'}</span>
                        {installInfo && (<><span className="sep">·</span><span className={installInfo.remaining <= 0 ? 'good' : ''}>{installInfo.total}x · {installInfo.remaining > 0 ? `${installInfo.remaining} restantes` : 'Quitado'}</span></>)}
                        {dueTxt && (<><span className="sep">·</span><span className={dueCls}>{dueTxt}</span></>)}
                        {card && (<><span className="sep">·</span><span>{card.name}</span></>)}
                      </div>
                    </div>
                  </div>
                  <div className="amt neg">{formatBRL(r.amount)}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button className={'toggle' + (off ? '' : ' on')} role="switch" aria-checked={!off} onClick={() => toggleRecurringForMonth(r.id)} title={off ? 'Pausada' : 'Ativa'} aria-label={`${r.description}: ${off ? 'pausada' : 'ativa'} neste mês`} />
                    <div className="row-actions">
                      <button onClick={() => setEditingRecurring(r)} aria-label="Editar"><Pencil size={14} /></button>
                      <button className="del" onClick={() => askConfirm(`Remover "${r.description}" das despesas fixas?`, 'Remover').then((ok) => { if (ok) removeRecurring(r.id) })} aria-label="Remover"><Trash2 size={14} /></button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="empty-box">Cadastre aluguel, internet, assinaturas, parcelamentos. Cada uma conta automaticamente todo mês.</div>
        )}
      </section>
    </div>
  )
}
