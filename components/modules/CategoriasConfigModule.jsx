'use client'

import { Pencil, Trash2, Settings, CreditCard, Download, Upload, Plus } from 'lucide-react'
import { formatBRL } from '@/lib/helpers'
import { CATEGORIES } from '@/lib/constants'
import CreditCardArt from '../CreditCardArt'
import CategoryIcon from '../CategoryIcon'

export function CategoriasModule({ ctx }) {
  const { data, expensesByCategory, setEditingBudget, removeBudget, askConfirm } = ctx

  return (
    <div className="page">
      <p className="page-intro">Defina um teto mensal de gasto para cada categoria e acompanhe quanto já usou. As cores e ícones aparecem nos gráficos e nas transações.</p>
      <div className="cards-2">
        {CATEGORIES.map((c, i) => {
          const gasto = expensesByCategory[c.id] || 0
          const limit = data.budgets[c.id]
          const hasBudget = limit != null
          const over = hasBudget && gasto > limit
          return (
            <div className="card reveal" key={c.id} style={{ padding: 18, animationDelay: i * 0.03 + 's' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
                <span style={{ width: 40, height: 40, borderRadius: 11, background: `color-mix(in oklab, ${c.color} 18%, transparent)`, display: 'grid', placeItems: 'center', flexShrink: 0 }}><CategoryIcon id={c.id} size={20} color={c.color} /></span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>{c.label}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>
                    {hasBudget ? <>Teto {formatBRL(limit)} · <span className="mono">{formatBRL(gasto)}</span> usados</> : <>Sem teto definido · <span className="mono">{formatBRL(gasto)}</span> no mês</>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 2 }}>
                  <button className="linkbtn muted" style={{ padding: '6px' }} onClick={() => setEditingBudget({ category: c.id, ...(hasBudget ? { amount: limit } : {}) })} title={hasBudget ? 'Editar teto' : 'Definir teto'}>
                    {hasBudget ? <Pencil size={15} /> : <Plus size={15} />}
                  </button>
                  {hasBudget && (
                    <button className="linkbtn danger" style={{ padding: '6px' }} onClick={() => askConfirm(`Remover o orçamento de ${c.label}?`, 'Remover').then((ok) => { if (ok) removeBudget(c.id) })} title="Remover teto"><Trash2 size={15} /></button>
                  )}
                </div>
              </div>
              {hasBudget && (<div className="pbar" style={{ marginTop: 14 }}><span style={{ width: Math.min(100, (gasto / limit) * 100) + '%', background: over ? 'var(--debt)' : c.color }} /></div>)}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function ConfiguracoesModule({ ctx }) {
  const { theme, toggleTheme, userCards, openModal, exportBackup, fileInputRef } = ctx

  return (
    <div className="page">
      <p className="page-intro">Preferências do app, aparência, cartões e backup dos seus dados.</p>
      <div className="cards-2">
        <section className="card set-card">
          <div className="card-head"><div className="eyebrow"><Settings size={13} /> Aparência</div></div>
          <div className="set-row">
            <div><div className="l">Tema escuro</div><div className="d">Alterna entre claro (papel) e escuro (espresso)</div></div>
            <button className={'toggle' + (theme === 'dark' ? ' on' : '')} role="switch" aria-checked={theme === 'dark'} onClick={toggleTheme} aria-label="Alternar tema" />
          </div>
        </section>

        <section className="card set-card">
          <div className="card-head"><div className="eyebrow"><CreditCard size={13} /> Cartões</div><button className="btn-ghost sm" onClick={() => openModal('cards')}><Plus size={14} /> Gerenciar</button></div>
          <p>Marque o cartão ao lançar despesas para acompanhar pra onde a grana vai.</p>
          {userCards.length > 0 ? (
            <div className="cc-grid">
              {userCards.map((c) => (<CreditCardArt key={c.id} id={c.id} name={c.name} />))}
            </div>
          ) : (
            <div className="empty-box">Cadastre os bancos/cartões que você usa (Nubank, Santander, C6, etc).</div>
          )}
        </section>

        <section className="card set-card">
          <div className="card-head"><div className="eyebrow"><Download size={13} /> Backup dos dados</div></div>
          <p>Salve uma cópia de tudo em JSON ou restaure a partir de um arquivo.</p>
          <div className="backup-btns">
            <button className="btn-ghost" onClick={exportBackup}><Download size={15} /> Salvar backup</button>
            <button className="btn-ghost" onClick={() => fileInputRef.current?.click()}><Upload size={15} /> Restaurar</button>
          </div>
        </section>
      </div>
    </div>
  )
}
