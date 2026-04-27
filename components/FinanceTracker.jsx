'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Plus, TrendingUp, TrendingDown, ChevronLeft, ChevronRight,
  Trash2, Target, Repeat, Download, BarChart3, CreditCard,
  Upload, Sun, Moon, Pencil, LogOut,
} from 'lucide-react'

import { supabase } from '@/lib/supabase'
import * as db from '@/lib/db'
import { CATEGORIES, THEME_KEY } from '@/lib/constants'
import {
  formatBRL, monthKey, monthLabel, emptyMonth,
  findCategory, findCard, getApplicableIncome, migrateData, getInstallmentInfo,
} from '@/lib/helpers'

import BankLogo from './BankLogo'
import Modal from './Modal'
import CardsModal from './CardsModal'
import IncomeHistoryModal from './IncomeHistoryModal'

export default function FinanceTracker() {
  const [currentMonth, setCurrentMonth] = useState(monthKey(new Date()))
  const [data, setData] = useState({
    monthlyData: {}, recurring: [], goals: {}, disabledRecurring: {}, cards: [], incomeHistory: [],
  })
  const [loaded, setLoaded] = useState(false)
  const [modal, setModal] = useState(null)
  const [editingRecurring, setEditingRecurring] = useState(null)
  const [editingIncome, setEditingIncome] = useState(null)
  const [theme, setTheme] = useState('light')
  const [loggingOut, setLoggingOut] = useState(false)
  const fileInputRef = useRef(null)
  const userIdRef = useRef(null)

  useEffect(() => {
    const savedTheme = localStorage.getItem(THEME_KEY)
    if (savedTheme === 'dark' || savedTheme === 'light') {
      setTheme(savedTheme)
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark')
    }

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { setLoaded(true); return }
      userIdRef.current = user.id
      db.loadAllData(user.id).then(({ data: fetchedData, error }) => {
        if (error) console.error('Erro ao carregar dados:', error)
        else if (fetchedData) setData(fetchedData)
        setLoaded(true)
      })
    })
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    localStorage.setItem(THEME_KEY, theme)
  }, [theme])

  const toggleTheme = () => setTheme((t) => (t === 'light' ? 'dark' : 'light'))

  const handleLogout = async () => {
    if (loggingOut) return
    setLoggingOut(true)
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('Erro ao sair:', error)
      setLoggingOut(false)
    }
  }

  const monthData = data.monthlyData[currentMonth] || emptyMonth()
  const disabledIds = data.disabledRecurring[currentMonth] || []
  const activeRecurring = data.recurring.filter((r) => !disabledIds.includes(r.id))
  const recurringTotal = activeRecurring.reduce((s, e) => s + e.amount, 0)
  const mainIncome = getApplicableIncome(data.incomeHistory, currentMonth)
  const totalExtras = monthData.extras.reduce((s, e) => s + e.amount, 0)
  const totalIncome = mainIncome + totalExtras
  const variableExpensesTotal = monthData.expenses.reduce((s, e) => s + e.amount, 0)
  const totalExpenses = variableExpensesTotal + recurringTotal
  const balance = totalIncome - totalExpenses
  const isRed = balance < 0
  const goal = data.goals[currentMonth] || 0
  const saved = Math.max(balance, 0)
  const goalProgress = goal > 0 ? Math.min(saved / goal, 1) : 0
  const userCards = data.cards.map((id) => findCard(id)).filter(Boolean)

  const expensesByCategory = {}
  ;[...monthData.expenses, ...activeRecurring].forEach((e) => {
    expensesByCategory[e.category] = (expensesByCategory[e.category] || 0) + e.amount
  })
  const chartData = CATEGORIES.map((c) => ({ ...c, value: expensesByCategory[c.id] || 0 }))
    .filter((c) => c.value > 0).sort((a, b) => b.value - a.value)
  const chartMax = Math.max(...chartData.map((c) => c.value), 1)

  const updateMonth = (updater) =>
    setData((prev) => ({
      ...prev,
      monthlyData: { ...prev.monthlyData, [currentMonth]: updater(prev.monthlyData[currentMonth] || emptyMonth()) },
    }))

  const setIncomeEntry = async ({ amount, startMonth }) => {
    const prev = data.incomeHistory
    setData((d) => ({
      ...d,
      incomeHistory: [...d.incomeHistory.filter((e) => e.startMonth !== startMonth), { startMonth, amount }]
        .sort((a, b) => a.startMonth.localeCompare(b.startMonth)),
    }))
    const { error } = await db.upsertIncome(userIdRef.current, { startMonth, amount })
    if (error) {
      console.error('Erro ao salvar renda:', error)
      setData((d) => ({ ...d, incomeHistory: prev }))
      alert('Erro ao salvar renda. Tente novamente.')
    }
  }

  const removeIncomeEntry = async (startMonth) => {
    const prev = data.incomeHistory
    setData((d) => ({ ...d, incomeHistory: d.incomeHistory.filter((e) => e.startMonth !== startMonth) }))
    const { error } = await db.deleteIncome(userIdRef.current, startMonth)
    if (error) {
      console.error('Erro ao remover renda:', error)
      setData((d) => ({ ...d, incomeHistory: prev }))
      alert('Erro ao remover renda.')
    }
  }

  const addExtra = async (entry) => {
    const id = crypto.randomUUID()
    const newEntry = { ...entry, id }
    updateMonth((m) => ({ ...m, extras: [...m.extras, newEntry] }))
    const { error } = await db.insertExtra(userIdRef.current, newEntry, currentMonth)
    if (error) {
      console.error('Erro ao salvar ganho extra:', error)
      updateMonth((m) => ({ ...m, extras: m.extras.filter((e) => e.id !== id) }))
      alert('Erro ao salvar ganho extra.')
    }
  }

  const addExpense = async (entry) => {
    const id = crypto.randomUUID()
    const newEntry = { ...entry, id }
    updateMonth((m) => ({ ...m, expenses: [...m.expenses, newEntry] }))
    const { error } = await db.insertExpense(userIdRef.current, newEntry, currentMonth)
    if (error) {
      console.error('Erro ao salvar despesa:', error)
      updateMonth((m) => ({ ...m, expenses: m.expenses.filter((e) => e.id !== id) }))
      alert('Erro ao salvar despesa.')
    }
  }

  const removeExtra = async (id) => {
    const prev = data.monthlyData[currentMonth]?.extras || []
    updateMonth((m) => ({ ...m, extras: m.extras.filter((e) => e.id !== id) }))
    const { error } = await db.deleteExtra(userIdRef.current, id)
    if (error) {
      console.error('Erro ao remover ganho extra:', error)
      updateMonth((m) => ({ ...m, extras: prev }))
      alert('Erro ao remover ganho extra.')
    }
  }

  const removeExpense = async (id) => {
    const prev = data.monthlyData[currentMonth]?.expenses || []
    updateMonth((m) => ({ ...m, expenses: m.expenses.filter((e) => e.id !== id) }))
    const { error } = await db.deleteExpense(userIdRef.current, id)
    if (error) {
      console.error('Erro ao remover despesa:', error)
      updateMonth((m) => ({ ...m, expenses: prev }))
      alert('Erro ao remover despesa.')
    }
  }

  const setGoal = async (amount) => {
    const prevGoals = data.goals
    setData((prev) => ({ ...prev, goals: { ...prev.goals, [currentMonth]: amount } }))
    const { error } = await db.upsertGoal(userIdRef.current, currentMonth, amount)
    if (error) {
      console.error('Erro ao salvar meta:', error)
      setData((prev) => ({ ...prev, goals: prevGoals }))
      alert('Erro ao salvar meta.')
    }
  }

  const addRecurring = async (entry) => {
    const id = crypto.randomUUID()
    const newEntry = { ...entry, id }
    setData((prev) => ({ ...prev, recurring: [...prev.recurring, newEntry] }))
    const { error } = await db.insertRecurring(userIdRef.current, newEntry)
    if (error) {
      console.error('Erro ao salvar despesa fixa:', error)
      setData((prev) => ({ ...prev, recurring: prev.recurring.filter((r) => r.id !== id) }))
      alert('Erro ao salvar despesa fixa.')
    }
  }

  const removeRecurring = async (id) => {
    const prevRecurring = data.recurring
    const prevDisabled = data.disabledRecurring
    setData((prev) => ({
      ...prev,
      recurring: prev.recurring.filter((r) => r.id !== id),
      disabledRecurring: Object.fromEntries(
        Object.entries(prev.disabledRecurring).map(([month, ids]) => [month, ids.filter((rid) => rid !== id)])
      ),
    }))
    const { error } = await db.deleteRecurring(id)
    if (error) {
      console.error('Erro ao remover despesa fixa:', error)
      setData((prev) => ({ ...prev, recurring: prevRecurring, disabledRecurring: prevDisabled }))
      alert('Erro ao remover despesa fixa.')
    }
  }

  const updateRecurring = async (id, updates) => {
    const prevRecurring = data.recurring
    setData((prev) => ({ ...prev, recurring: prev.recurring.map((r) => (r.id === id ? { ...r, ...updates } : r)) }))
    const { error } = await db.updateRecurringEntry(id, updates)
    if (error) {
      console.error('Erro ao atualizar despesa fixa:', error)
      setData((prev) => ({ ...prev, recurring: prevRecurring }))
      alert('Erro ao atualizar despesa fixa.')
    }
  }

  const toggleRecurringForMonth = async (id) => {
    const cur = data.disabledRecurring[currentMonth] || []
    const isDisabled = cur.includes(id)
    setData((prev) => {
      const curIds = prev.disabledRecurring[currentMonth] || []
      const next = curIds.includes(id) ? curIds.filter((d) => d !== id) : [...curIds, id]
      return { ...prev, disabledRecurring: { ...prev.disabledRecurring, [currentMonth]: next } }
    })
    const { error } = isDisabled
      ? await db.enableRecurring(userIdRef.current, currentMonth, id)
      : await db.disableRecurring(userIdRef.current, currentMonth, id)
    if (error) {
      console.error('Erro ao atualizar despesa fixa:', error)
      setData((prev) => ({ ...prev, disabledRecurring: { ...prev.disabledRecurring, [currentMonth]: cur } }))
      alert('Erro ao atualizar despesa fixa.')
    }
  }

  const toggleCard = async (cardId) => {
    const isActive = data.cards.includes(cardId)
    setData((prev) => ({
      ...prev,
      cards: isActive ? prev.cards.filter((c) => c !== cardId) : [...prev.cards, cardId],
    }))
    const { error } = isActive
      ? await db.deleteCard(userIdRef.current, cardId)
      : await db.insertCard(userIdRef.current, cardId)
    if (error) {
      console.error('Erro ao atualizar cartão:', error)
      setData((prev) => ({
        ...prev,
        cards: isActive ? [...prev.cards, cardId] : prev.cards.filter((c) => c !== cardId),
      }))
      alert('Erro ao atualizar cartão.')
    }
  }

  const changeMonth = (delta) => {
    const [y, m] = currentMonth.split('-').map(Number)
    setCurrentMonth(monthKey(new Date(y, m - 1 + delta, 1)))
  }

  const allTransactions = [
    ...monthData.extras.map((e) => ({ ...e, type: 'extra' })),
    ...monthData.expenses.map((e) => ({ ...e, type: 'expense' })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date))

  const exportBackup = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `controle-financeiro-backup-${new Date().toISOString().split('T')[0]}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  const importBackup = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result)
        if (!parsed.monthlyData) throw new Error('Arquivo inválido')
        if (confirm('Isso vai substituir TODOS os dados atuais. Continuar?')) {
          const migrated = migrateData(parsed)
          setData(migrated)
          const { error } = await db.replaceAllData(userIdRef.current, migrated)
          if (error) {
            console.error('Erro ao importar backup:', error)
            alert('Dados importados localmente, mas houve erro ao salvar no servidor. Recarregue a página.')
          }
        }
      } catch { alert('Arquivo de backup inválido.') }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  if (!loaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 dark:bg-stone-950">
        <p className="text-stone-400 dark:text-stone-500 text-sm">Carregando…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 transition-colors">
      <div className="max-w-2xl mx-auto px-5 py-6 pb-32">

        {/* Header */}
        <header className="mb-6">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs uppercase tracking-[0.2em] text-stone-500 dark:text-stone-400">Controle</p>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleTheme}
                className="w-7 h-7 rounded-full flex items-center justify-center bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 hover:bg-stone-100 dark:hover:bg-stone-800 transition text-stone-700 dark:text-stone-300"
                aria-label="Alternar tema"
              >
                {theme === 'dark' ? <Sun size={13} /> : <Moon size={13} />}
              </button>
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="w-7 h-7 rounded-full flex items-center justify-center bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 hover:bg-stone-100 dark:hover:bg-stone-800 transition text-stone-700 dark:text-stone-300 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Sair"
              >
                <LogOut size={13} />
              </button>
            </div>
          </div>
          <h1 className="text-3xl mb-5 font-light tracking-tight">
            Suas <em className="not-italic font-semibold">finanças</em> do mês
          </h1>
          <div className="flex items-center justify-between bg-white dark:bg-stone-900 rounded-full p-1 border border-stone-200 dark:border-stone-800">
            <button onClick={() => changeMonth(-1)} className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-stone-100 dark:hover:bg-stone-800 transition" aria-label="Mês anterior">
              <ChevronLeft size={18} />
            </button>
            <p className="text-sm capitalize font-medium">{monthLabel(currentMonth)}</p>
            <button onClick={() => changeMonth(1)} className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-stone-100 dark:hover:bg-stone-800 transition" aria-label="Próximo mês">
              <ChevronRight size={18} />
            </button>
          </div>
        </header>

        {/* Renda principal */}
        <div className="bg-white dark:bg-stone-900 rounded-2xl p-4 border border-stone-200 dark:border-stone-800 mb-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.15em] text-stone-500 dark:text-stone-400">Renda principal</p>
            <p className="text-xl font-mono">{formatBRL(mainIncome)}</p>
            {data.incomeHistory.length > 1 && (
              <button onClick={() => setModal('incomeHistory')} className="text-[11px] text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white underline-offset-4 hover:underline mt-0.5">
                {data.incomeHistory.length} alterações no histórico
              </button>
            )}
          </div>
          <button onClick={() => setModal('income')} className="px-4 py-2 bg-stone-900 dark:bg-white text-white dark:text-stone-900 text-sm rounded-full hover:bg-stone-700 dark:hover:bg-stone-200 transition flex-shrink-0">
            {mainIncome > 0 ? 'Editar' : 'Definir'}
          </button>
        </div>

        {/* Saldo */}
        <div className={`rounded-3xl p-6 mb-3 border ${isRed ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-100 dark:border-rose-900/40' : 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-900/40'}`}>
          <p className="text-xs uppercase tracking-[0.2em] text-stone-500 dark:text-stone-400 mb-2">{isRed ? 'No vermelho' : 'Saldo do mês'}</p>
          <p className={`text-5xl mb-2 font-mono tracking-tight ${isRed ? 'text-rose-900 dark:text-rose-300' : 'text-emerald-900 dark:text-emerald-300'}`}>
            {formatBRL(balance)}
          </p>
          <p className="text-sm text-stone-600 dark:text-stone-400">{formatBRL(totalIncome)} entrou · {formatBRL(totalExpenses)} saiu</p>
        </div>

        {/* Entradas / Saídas */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="bg-white dark:bg-stone-900 rounded-2xl p-4 border border-stone-200 dark:border-stone-800">
            <div className="flex items-center gap-2 text-stone-500 dark:text-stone-400 text-[10px] uppercase tracking-[0.15em] mb-2"><TrendingUp size={12} /> Entradas</div>
            <p className="text-2xl font-mono">{formatBRL(totalIncome)}</p>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">Renda + {monthData.extras.length} {monthData.extras.length === 1 ? 'extra' : 'extras'}</p>
          </div>
          <div className="bg-white dark:bg-stone-900 rounded-2xl p-4 border border-stone-200 dark:border-stone-800">
            <div className="flex items-center gap-2 text-stone-500 dark:text-stone-400 text-[10px] uppercase tracking-[0.15em] mb-2"><TrendingDown size={12} /> Saídas</div>
            <p className="text-2xl font-mono">{formatBRL(totalExpenses)}</p>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">{activeRecurring.length} fixas + {monthData.expenses.length} variáveis</p>
          </div>
        </div>

        {/* Meta */}
        <div className="bg-white dark:bg-stone-900 rounded-2xl p-5 border border-stone-200 dark:border-stone-800 mb-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Target size={14} className="text-stone-500 dark:text-stone-400" />
              <p className="text-[10px] uppercase tracking-[0.15em] text-stone-500 dark:text-stone-400">Meta de poupança</p>
            </div>
            <button onClick={() => setModal('goal')} className="text-xs text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white underline-offset-4 hover:underline">
              {goal > 0 ? 'Editar' : 'Definir'}
            </button>
          </div>
          {goal > 0 ? (
            <>
              <div className="flex items-baseline justify-between mb-2">
                <p className="text-2xl font-mono">{formatBRL(saved)}</p>
                <p className="text-sm text-stone-500 dark:text-stone-400">de {formatBRL(goal)}</p>
              </div>
              <div className="h-2 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden mb-2">
                <div className={`h-full rounded-full transition-all duration-500 ${goalProgress >= 1 ? 'bg-emerald-600' : 'bg-stone-900 dark:bg-stone-100'}`} style={{ width: `${goalProgress * 100}%` }} />
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                {goalProgress >= 1 ? `Meta batida! Sobraram ${formatBRL(saved - goal)} além da meta.`
                  : isRed ? `${Math.round(goalProgress * 100)}% — feche o vermelho primeiro.`
                  : `${Math.round(goalProgress * 100)}% — faltam ${formatBRL(goal - saved)} pra fechar a meta.`}
              </p>
            </>
          ) : (
            <p className="text-sm text-stone-500 dark:text-stone-400">Sem meta esse mês. Defina um valor pra acompanhar quanto você está conseguindo guardar.</p>
          )}
        </div>

        {/* Cartões */}
        <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 mb-3 overflow-hidden">
          <div className="p-5 flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1"><CreditCard size={14} className="text-stone-500 dark:text-stone-400" /><p className="text-[10px] uppercase tracking-[0.15em] text-stone-500 dark:text-stone-400">Cartões</p></div>
              <p className="text-xl font-mono">{userCards.length} {userCards.length === 1 ? 'cartão' : 'cartões'}</p>
              <p className="text-xs text-stone-500 dark:text-stone-400">Use ao lançar despesas pra ver onde tá indo a grana</p>
            </div>
            <button onClick={() => setModal('cards')} className="px-3 py-1.5 bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs rounded-full hover:bg-stone-200 dark:hover:bg-stone-700 transition flex items-center gap-1">
              <Plus size={12} /> Gerenciar
            </button>
          </div>
          {userCards.length > 0 ? (
            <div className="px-5 pb-5 flex flex-wrap gap-2">
              {userCards.map((card) => (
                <div key={card.id} className="flex items-center gap-2 pl-1.5 pr-3 py-1 rounded-full text-xs font-medium border bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200">
                  <BankLogo id={card.id} size={20} />{card.name}
                </div>
              ))}
            </div>
          ) : (
            <p className="px-5 pb-5 text-xs text-stone-500 dark:text-stone-400">Cadastre os bancos/cartões que você usa (Nubank, Santander, C6, etc).</p>
          )}
        </div>

        {/* Despesas fixas */}
        <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 mb-3 overflow-hidden">
          <div className="p-5 flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1"><Repeat size={14} className="text-stone-500 dark:text-stone-400" /><p className="text-[10px] uppercase tracking-[0.15em] text-stone-500 dark:text-stone-400">Despesas fixas</p></div>
              <p className="text-xl font-mono">{formatBRL(recurringTotal)}</p>
              <p className="text-xs text-stone-500 dark:text-stone-400">{activeRecurring.length} de {data.recurring.length} ativas neste mês</p>
            </div>
            <button onClick={() => setModal('recurring')} className="px-3 py-1.5 bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs rounded-full hover:bg-stone-200 dark:hover:bg-stone-700 transition flex items-center gap-1">
              <Plus size={12} /> Adicionar
            </button>
          </div>
          {data.recurring.length > 0 ? (
            <ul className="divide-y divide-stone-100 dark:divide-stone-800 border-t border-stone-100 dark:border-stone-800">
              {data.recurring.map((r) => {
                const cat = findCategory(r.category)
                const card = r.cardId ? findCard(r.cardId) : null
                const isDisabled = disabledIds.includes(r.id)
                const displayEmoji = r.category === 'outros' && r.customCategoryEmoji ? r.customCategoryEmoji : cat?.emoji || '📦'
                const installInfo = getInstallmentInfo(r, currentMonth)
                return (
                  <li key={r.id} className={`p-4 flex items-center justify-between gap-3 transition ${isDisabled ? 'opacity-40' : ''}`}>
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-9 h-9 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center flex-shrink-0">
                        <span className="text-base">{displayEmoji}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm font-medium truncate ${isDisabled ? 'line-through' : ''}`}>{r.description}</p>
                        <p className="text-xs text-stone-500 dark:text-stone-400 flex items-center gap-1.5 flex-wrap">
                          <span>{cat?.label || 'Outros'}</span>
                          {installInfo && (<><span>·</span><span className={installInfo.remaining <= 0 ? 'text-emerald-600 dark:text-emerald-400' : ''}>{installInfo.total}x · {installInfo.remaining > 0 ? `${installInfo.remaining} restantes` : 'Quitado'}</span></>)}
                          {card && (<><span>·</span><BankLogo id={card.id} size={14} /><span>{card.name}</span></>)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <p className="text-sm font-semibold whitespace-nowrap">{formatBRL(r.amount)}</p>
                      <button onClick={() => toggleRecurringForMonth(r.id)} className={`text-[10px] px-2.5 py-1 rounded-full transition font-medium ${isDisabled ? 'bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700' : 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-900/60'}`} title={isDisabled ? 'Ativar este mês' : 'Pular este mês'}>
                        {isDisabled ? 'OFF' : 'ON'}
                      </button>
                      <button onClick={() => setEditingRecurring(r)} className="text-stone-300 dark:text-stone-600 hover:text-stone-700 dark:hover:text-stone-300 p-1.5 transition" aria-label="Editar"><Pencil size={13} /></button>
                      <button onClick={() => { if (confirm(`Remover "${r.description}" das despesas fixas?`)) removeRecurring(r.id) }} className="text-stone-300 dark:text-stone-600 hover:text-rose-600 dark:hover:text-rose-500 p-1.5 transition" aria-label="Remover"><Trash2 size={13} /></button>
                    </div>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="px-5 pb-5 text-xs text-stone-500 dark:text-stone-400">Cadastre coisas como aluguel, internet, assinaturas. Cada uma conta automaticamente todo mês.</p>
          )}
        </div>

        {/* Movimentações */}
        <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 overflow-hidden mb-3">
          <div className="p-5 border-b border-stone-100 dark:border-stone-800">
            <h3 className="text-xl font-medium tracking-tight">Movimentações do mês</h3>
            <p className="text-xs text-stone-500 dark:text-stone-400">Ganhos extras e despesas variáveis</p>
          </div>
          {allTransactions.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-stone-400 dark:text-stone-500 text-sm">Ainda nada por aqui.</p>
              <p className="text-stone-400 dark:text-stone-500 text-xs mt-1">Use os botões abaixo pra começar.</p>
            </div>
          ) : (
            <ul className="divide-y divide-stone-100 dark:divide-stone-800">
              {allTransactions.map((t) => {
                const cat = findCategory(t.category)
                const card = t.cardId ? findCard(t.cardId) : null
                const displayEmoji = t.category === 'outros' && t.customCategoryEmoji ? t.customCategoryEmoji : cat?.emoji || '📦'
                return (
                  <li key={`${t.type}-${t.id}`} className="p-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-base ${t.type === 'extra' ? 'bg-emerald-100 dark:bg-emerald-900/40' : 'bg-stone-100 dark:bg-stone-800'}`}>
                        {t.type === 'extra' ? <TrendingUp size={16} className="text-emerald-700 dark:text-emerald-400" /> : <span>{displayEmoji}</span>}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{t.description}</p>
                        <p className="text-xs text-stone-500 dark:text-stone-400 flex items-center gap-1.5 flex-wrap">
                          <span>{new Date(t.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</span>
                          {t.type === 'expense' && (<><span>·</span><span>{cat?.label || 'Outros'}</span></>)}
                          {t.type === 'extra' && (<><span>·</span><span>ganho extra</span></>)}
                          {card && (<><span>·</span><BankLogo id={card.id} size={14} /><span>{card.name}</span></>)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <p className={`text-sm font-semibold whitespace-nowrap ${t.type === 'extra' ? 'text-emerald-700 dark:text-emerald-400' : 'text-stone-900 dark:text-stone-100'}`}>
                        {t.type === 'extra' ? '+' : '−'} {formatBRL(t.amount)}
                      </p>
                      <button onClick={() => t.type === 'extra' ? removeExtra(t.id) : removeExpense(t.id)} className="text-stone-300 dark:text-stone-600 hover:text-rose-600 dark:hover:text-rose-500 p-2 transition" aria-label="Remover">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* Chart */}
        {chartData.length > 0 && (
          <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-5 mb-3">
            <div className="flex items-center gap-2 mb-4"><BarChart3 size={14} className="text-stone-500 dark:text-stone-400" /><p className="text-[10px] uppercase tracking-[0.15em] text-stone-500 dark:text-stone-400">Gastos por categoria</p></div>
            <div className="space-y-3">
              {chartData.map((c) => {
                const pct = Math.round((c.value / totalExpenses) * 100)
                return (
                  <div key={c.id}>
                    <div className="flex items-center justify-between mb-1.5 text-sm">
                      <span className="flex items-center gap-2"><span>{c.emoji}</span><span className="text-stone-700 dark:text-stone-300">{c.label}</span><span className="text-xs text-stone-400 dark:text-stone-500">{pct}%</span></span>
                      <span className="font-medium text-stone-900 dark:text-stone-100">{formatBRL(c.value)}</span>
                    </div>
                    <div className="h-2 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(c.value / chartMax) * 100}%`, backgroundColor: c.color }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Backup */}
        <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-5 mb-3">
          <p className="text-[10px] uppercase tracking-[0.15em] text-stone-500 dark:text-stone-400 mb-1">Backup completo</p>
          <p className="text-xs text-stone-500 dark:text-stone-400 mb-4">Salva tudo num arquivo JSON. Útil pra mover de PC ou guardar uma cópia segura.</p>
          <div className="flex flex-col sm:flex-row gap-2">
            <button onClick={exportBackup} className="flex-1 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-900 dark:text-stone-100 py-2.5 rounded-full text-sm font-medium transition flex items-center justify-center gap-2">
              <Download size={14} /> Salvar backup
            </button>
            <button onClick={() => fileInputRef.current?.click()} className="flex-1 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-900 dark:text-stone-100 py-2.5 rounded-full text-sm font-medium transition flex items-center justify-center gap-2">
              <Upload size={14} /> Restaurar backup
            </button>
            <input type="file" accept=".json" ref={fileInputRef} onChange={importBackup} className="hidden" />
          </div>
        </div>
      </div>

      {/* Floating buttons */}
      <div className="fixed bottom-0 left-0 right-0 pointer-events-none">
        <div className="bg-gradient-to-t from-stone-50 dark:from-stone-950 via-stone-50/90 dark:via-stone-950/90 to-transparent pt-10 pb-5 px-5">
          <div className="max-w-2xl mx-auto flex gap-2 pointer-events-auto">
            <button onClick={() => setModal('extra')} className="flex-1 bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white py-3.5 rounded-full text-sm font-medium transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-700/20">
              <Plus size={16} /> Ganho extra
            </button>
            <button onClick={() => setModal('expense')} className="flex-1 bg-stone-900 dark:bg-white hover:bg-stone-700 dark:hover:bg-stone-200 text-white dark:text-stone-900 py-3.5 rounded-full text-sm font-medium transition flex items-center justify-center gap-2 shadow-lg shadow-stone-900/20 dark:shadow-white/10">
              <Plus size={16} /> Despesa
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      {modal === 'cards' ? (
        <CardsModal onClose={() => setModal(null)} activeCards={data.cards} onToggle={toggleCard} />
      ) : modal === 'incomeHistory' ? (
        <IncomeHistoryModal onClose={() => setModal(null)} incomeHistory={data.incomeHistory} onRemove={removeIncomeEntry} onEdit={(entry) => { setEditingIncome(entry); setModal(null) }} />
      ) : modal ? (
        <Modal type={modal} onClose={() => setModal(null)} currentIncome={mainIncome} currentGoal={goal} userCards={userCards} currentViewedMonth={currentMonth}
          onSubmit={(payload) => {
            if (modal === 'income') setIncomeEntry(payload)
            else if (modal === 'extra') addExtra(payload)
            else if (modal === 'expense') addExpense(payload)
            else if (modal === 'goal') setGoal(payload.amount)
            else if (modal === 'recurring') addRecurring(payload)
            setModal(null)
          }}
        />
      ) : null}

      {editingIncome && (
        <Modal type="income" initialValues={editingIncome} onClose={() => setEditingIncome(null)} currentIncome={editingIncome.amount} currentGoal={goal} userCards={userCards} currentViewedMonth={currentMonth}
          onSubmit={(payload) => {
            if (editingIncome.startMonth !== payload.startMonth) removeIncomeEntry(editingIncome.startMonth)
            setIncomeEntry(payload)
            setEditingIncome(null)
          }}
        />
      )}

      {editingRecurring && (
        <Modal type="recurring" initialValues={editingRecurring} onClose={() => setEditingRecurring(null)} currentIncome={mainIncome} currentGoal={goal} userCards={userCards} currentViewedMonth={currentMonth}
          onSubmit={(payload) => { updateRecurring(editingRecurring.id, payload); setEditingRecurring(null) }}
        />
      )}
    </div>
  )
}
