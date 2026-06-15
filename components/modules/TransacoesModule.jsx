'use client'

import { useState, useMemo } from 'react'
import { Search, Download, Trash2 } from 'lucide-react'
import { formatBRL, findCategory, monthLabel } from '@/lib/helpers'
import { CATEGORIES } from '@/lib/constants'

export default function TransacoesModule({ ctx }) {
  const { data, removeTransaction, askConfirm } = ctx
  const [q, setQ] = useState('')
  const [fCat, setFCat] = useState('todas')
  const [fTipo, setFTipo] = useState('todos')
  const [fPer, setFPer] = useState('todos')
  const [sort, setSort] = useState({ key: 'date', dir: 'desc' })

  // achata todas as transações (extras + despesas variáveis) de todos os meses
  const allTx = useMemo(() => {
    const out = []
    for (const [month, md] of Object.entries(data.monthlyData || {})) {
      for (const e of md.extras || []) out.push({ ...e, month, type: 'extra' })
      for (const e of md.expenses || []) out.push({ ...e, month, type: 'expense' })
    }
    return out
  }, [data.monthlyData])

  const periods = useMemo(() => {
    const keys = Object.keys(data.monthlyData || {}).filter((m) => (data.monthlyData[m].extras?.length || data.monthlyData[m].expenses?.length))
    return keys.sort((a, b) => b.localeCompare(a))
  }, [data.monthlyData])

  const filtered = useMemo(() => {
    let r = allTx.filter((t) => {
      if (q && !t.description.toLowerCase().includes(q.toLowerCase())) return false
      if (fCat !== 'todas' && t.category !== fCat) return false
      if (fTipo === 'receita' && t.type !== 'extra') return false
      if (fTipo === 'despesa' && t.type !== 'expense') return false
      if (fPer !== 'todos' && t.month !== fPer) return false
      return true
    })
    r = [...r].sort((a, b) => {
      let av, bv
      if (sort.key === 'valor') { av = a.type === 'extra' ? a.amount : -a.amount; bv = b.type === 'extra' ? b.amount : -b.amount }
      else if (sort.key === 'desc') { av = a.description.toLowerCase(); bv = b.description.toLowerCase() }
      else if (sort.key === 'cat') { av = a.category || ''; bv = b.category || '' }
      else { av = a.date; bv = b.date }
      if (av < bv) return sort.dir === 'asc' ? -1 : 1
      if (av > bv) return sort.dir === 'asc' ? 1 : -1
      return 0
    })
    return r
  }, [allTx, q, fCat, fTipo, fPer, sort])

  const totReceita = filtered.filter((t) => t.type === 'extra').reduce((s, t) => s + t.amount, 0)
  const totDespesa = filtered.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)

  const toggleSort = (key) => setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'desc' }))
  const arr = (key) => (sort.key === key ? (sort.dir === 'asc' ? '▲' : '▼') : '')

  const SortTh = ({ k, num, children }) => (
    <th className={'sortable' + (num ? ' num' : '')} aria-sort={sort.key === k ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button type="button" onClick={() => toggleSort(k)}>{children} <span className="arr">{arr(k)}</span></button>
    </th>
  )

  const exportCSV = () => {
    const head = ['Data', 'Descrição', 'Categoria', 'Tipo', 'Valor']
    const lines = filtered.map((t) => {
      const cat = findCategory(t.category)?.label || (t.type === 'extra' ? 'Ganho extra' : 'Outros')
      const val = (t.type === 'extra' ? t.amount : -t.amount).toFixed(2).replace('.', ',')
      return [t.date, `"${t.description}"`, cat, t.type === 'extra' ? 'receita' : 'despesa', val].join(';')
    })
    const csv = [head.join(';'), ...lines].join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'transacoes.csv'
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  }

  return (
    <div className="page">
      <p className="page-intro">Todas as suas receitas e despesas em um só lugar. Pesquise, filtre por período, categoria ou tipo, ordene e exporte.</p>

      <div className="toolbar reveal">
        <div className="search">
          <span className="ic"><Search size={16} /></span>
          <input placeholder="Pesquisar descrição…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="selectbox">
          <select className="filter" value={fPer} onChange={(e) => setFPer(e.target.value)}>
            <option value="todos">Todo período</option>
            {periods.map((m) => <option key={m} value={m} style={{ textTransform: 'capitalize' }}>{monthLabel(m)}</option>)}
          </select>
        </div>
        <div className="selectbox">
          <select className="filter" value={fCat} onChange={(e) => setFCat(e.target.value)}>
            <option value="todas">Todas categorias</option>
            {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </div>
        <div className="selectbox">
          <select className="filter" value={fTipo} onChange={(e) => setFTipo(e.target.value)}>
            <option value="todos">Receita e despesa</option>
            <option value="receita">Só receitas</option>
            <option value="despesa">Só despesas</option>
          </select>
        </div>
        <button className="btn-ghost" onClick={exportCSV}><Download size={15} /> CSV</button>
      </div>

      <section className="card reveal" style={{ padding: '8px 10px 4px', animationDelay: '.06s' }}>
        <table className="dtable">
          <thead>
            <tr>
              <SortTh k="date">Data</SortTh>
              <SortTh k="desc">Descrição</SortTh>
              <SortTh k="cat">Categoria</SortTh>
              <th>Tipo</th>
              <SortTh k="valor" num>Valor</SortTh>
              <th className="num"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((t) => {
              const pos = t.type === 'extra'
              const cat = findCategory(t.category)
              return (
                <tr key={`${t.type}-${t.id}`}>
                  <td className="date">{new Date(t.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</td>
                  <td className="desc">{t.description}</td>
                  <td><span className="cat-pill"><span className="cat-dot" style={{ background: pos ? 'var(--accent)' : (cat?.color || '#8a8378') }} />{pos ? 'Ganho extra' : (cat?.label || 'Outros')}</span></td>
                  <td><span className={'type-pill ' + (pos ? 'receita' : 'despesa')}>{pos ? 'Receita' : 'Despesa'}</span></td>
                  <td className="amt num" style={{ color: pos ? 'var(--accent-ink)' : 'var(--ink)' }}>{pos ? '+ ' : '− '}{formatBRL(t.amount)}</td>
                  <td className="num">
                    <button className="linkbtn danger" style={{ padding: '4px 6px' }} onClick={() => askConfirm(`Excluir "${t.description}"?`, 'Excluir').then((ok) => { if (ok) removeTransaction(t) })} title="Excluir"><Trash2 size={14} /></button>
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (<tr><td colSpan="6" style={{ textAlign: 'center', padding: '36px', color: 'var(--muted)' }}>Nenhuma transação encontrada com esses filtros.</td></tr>)}
          </tbody>
        </table>
      </section>

      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', fontSize: 13.5, color: 'var(--muted)', padding: '0 4px' }}>
        <span>{filtered.length} {filtered.length === 1 ? 'transação' : 'transações'}</span>
        <span>Receitas: <b className="mono" style={{ color: 'var(--accent-ink)' }}>{formatBRL(totReceita)}</b></span>
        <span>Despesas: <b className="mono" style={{ color: 'var(--ink)' }}>{formatBRL(totDespesa)}</b></span>
        <span>Saldo: <b className="mono" style={{ color: totReceita - totDespesa >= 0 ? 'var(--accent-ink)' : 'var(--debt)' }}>{(totReceita - totDespesa) >= 0 ? '+ ' : '− '}{formatBRL(Math.abs(totReceita - totDespesa))}</b></span>
      </div>
    </div>
  )
}
