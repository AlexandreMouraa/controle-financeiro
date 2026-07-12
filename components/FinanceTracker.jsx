'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Plus, TrendingUp, TrendingDown, ChevronLeft, ChevronRight,
  Trash2, Target, Repeat, Download, BarChart3, CreditCard,
  Upload, Sun, Moon, Pencil, LogOut, Lightbulb, Shield, Wallet, CalendarClock,
  Check,
} from 'lucide-react'

import { supabase } from '@/lib/supabase'
import * as db from '@/lib/db'
import { CATEGORIES, THEME_KEY } from '@/lib/constants'
import {
  formatBRL, monthKey, monthLabel, emptyMonth, shiftMonth, computeMonthSummary,
  findCategory, findCard, migrateData, getInstallmentInfo, computeGoalProgress,
  computeInsights, computeReserveProgress,
} from '@/lib/helpers'

import BankLogo from './BankLogo'
import Modal from './Modal'
import CardsModal from './CardsModal'
import IncomeHistoryModal from './IncomeHistoryModal'
import ToastContainer from './Toast'
import ConfirmDialog from './ConfirmDialog'
import ProgressRing from './ProgressRing'
import DonutChart from './DonutChart'
import Sparkline from './Sparkline'
import DashboardSkeleton from './DashboardSkeleton'
import EmptyState from './EmptyState'

const splitBRL = (n) => {
  const s = Math.abs(n).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const [reais, cents] = s.split(',')
  return { reais, cents }
}

export default function FinanceTracker() {
  const [currentMonth, setCurrentMonth] = useState(monthKey(new Date()))
  const [data, setData] = useState({
    monthlyData: {}, recurring: [], goal: null, disabledRecurring: {}, paidRecurring: {}, cards: [], incomeHistory: [],
    budgets: {}, reserve: null,
  })
  const [loaded, setLoaded] = useState(false)
  const [modal, setModal] = useState(null)
  const [editingRecurring, setEditingRecurring] = useState(null)
  const [editingBudget, setEditingBudget] = useState(null)
  const [editingIncome, setEditingIncome] = useState(null)
  const [editingTransaction, setEditingTransaction] = useState(null)
  const [theme, setTheme] = useState('light')
  const [loggingOut, setLoggingOut] = useState(false)
  const [tab, setTab] = useState('panorama')
  const [fabOpen, setFabOpen] = useState(false)
  const fileInputRef = useRef(null)
  const userIdRef = useRef(null)
  const [toasts, setToasts] = useState([])
  const [confirmState, setConfirmState] = useState(null)

  const addToast = useCallback((message, type = 'error') => {
    setToasts((t) => [...t, { id: crypto.randomUUID(), message, type }])
  }, [])
  const dismissToast = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id))
  }, [])

  const askConfirm = (message, confirmLabel) =>
    new Promise((resolve) => setConfirmState({ message, confirmLabel, resolve }))
  const resolveConfirm = (value) => {
    setConfirmState((s) => {
      s?.resolve(value)
      return null
    })
  }

  useEffect(() => {
    const savedTheme = localStorage.getItem(THEME_KEY)
    if (savedTheme === 'dark' || savedTheme === 'light') {
      setTheme(savedTheme)
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark')
    }

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        // sessão podre: renderizar o dashboard sem userId deixava tudo vazio
        // e toda gravação falhava — limpa a sessão e volta pro login
        supabase.auth.signOut({ scope: 'local' }).finally(() => {
          window.location.replace('/login')
        })
        return
      }
      userIdRef.current = user.id
      db.loadAllData(user.id).then(({ data: fetchedData, error }) => {
        if (error) {
          console.error('Erro ao carregar dados:', error)
          addToast('Erro ao carregar seus dados. Recarregue a página.')
        } else if (fetchedData) setData(fetchedData)
        setLoaded(true)
      })
    }).catch(() => window.location.replace('/login'))
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
  const paidRecurringIds = data.paidRecurring[currentMonth] || []
  const activeRecurring = data.recurring.filter((r) => !disabledIds.includes(r.id))

  // Checklist "pago": pendências do mês (fixas ativas não-pagas + despesas avulsas não-pagas)
  const pendingRecurring = activeRecurring.filter((r) => !paidRecurringIds.includes(r.id))
  const pendingExpenses = monthData.expenses.filter((e) => !e.paid)
  const pendingRecurringTotal = pendingRecurring.reduce((s, r) => s + r.amount, 0)
  const pendingExpensesTotal = pendingExpenses.reduce((s, e) => s + e.amount, 0)
  const pendingCount = pendingRecurring.length + pendingExpenses.length
  const pendingTotal = pendingRecurringTotal + pendingExpensesTotal
  const {
    recurringTotal, mainIncome, totalExtras, totalIncome,
    variableExpensesTotal, totalExpenses, balance,
  } = computeMonthSummary(data, currentMonth)
  const isRed = balance < 0
  const goalInfo = computeGoalProgress(data, currentMonth)
  const reserveInfo = computeReserveProgress(data, currentMonth)
  const insights = computeInsights(data, currentMonth)
  const userCards = data.cards.map((id) => findCard(id)).filter(Boolean)

  const prevBalance = computeMonthSummary(data, shiftMonth(currentMonth, -1)).balance
  const balanceDelta = balance - prevBalance
  const prevMonthShort = monthLabel(shiftMonth(currentMonth, -1)).split(' de ')[0]
  const sparkValues = Array.from({ length: 6 }, (_, i) =>
    computeMonthSummary(data, shiftMonth(currentMonth, i - 5)).balance
  )
  const committedPct = totalIncome > 0 ? totalExpenses / totalIncome : 0
  const health = isRed
    ? { label: 'No vermelho', cls: 'debt' }
    : goalInfo?.done
    ? { label: 'Meta batida', cls: '' }
    : committedPct >= 0.9
    ? { label: 'Atenção', cls: 'warn' }
    : { label: 'Tranquilo', cls: '' }

  const hasAnyData =
    data.incomeHistory.length > 0 ||
    data.recurring.length > 0 ||
    data.cards.length > 0 ||
    data.goal != null ||
    data.reserve != null ||
    Object.keys(data.budgets).length > 0 ||
    Object.values(data.monthlyData).some((m) => m.expenses.length > 0 || m.extras.length > 0)
  const isEmpty = loaded && hasAnyData === false

  // Para destacar vencimentos só no mês real corrente.
  const realMonth = monthKey(new Date())
  const todayDay = new Date().getDate()
  const isCurrentRealMonth = currentMonth === realMonth

  const expensesByCategory = {}
  ;[...monthData.expenses, ...activeRecurring].forEach((e) => {
    expensesByCategory[e.category] = (expensesByCategory[e.category] || 0) + e.amount
  })
  const chartData = CATEGORIES.map((c) => ({ ...c, value: expensesByCategory[c.id] || 0 }))
    .filter((c) => c.value > 0).sort((a, b) => b.value - a.value)

  const budgetList = Object.entries(data.budgets)
    .map(([catId, limit]) => {
      const cat = findCategory(catId)
      const spent = expensesByCategory[catId] || 0
      return { catId, label: cat?.label || 'Outros', emoji: cat?.emoji || '📦', color: cat?.color || '#8a8378', limit, spent, pct: limit > 0 ? spent / limit : 0 }
    })
    .sort((a, b) => b.pct - a.pct)
  const unbudgetedCategories = CATEGORIES.filter((c) => !(c.id in data.budgets))

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
      addToast('Erro ao salvar renda. Tente novamente.')
    }
  }

  const removeIncomeEntry = async (startMonth) => {
    const prev = data.incomeHistory
    setData((d) => ({ ...d, incomeHistory: d.incomeHistory.filter((e) => e.startMonth !== startMonth) }))
    const { error } = await db.deleteIncome(userIdRef.current, startMonth)
    if (error) {
      console.error('Erro ao remover renda:', error)
      setData((d) => ({ ...d, incomeHistory: prev }))
      addToast('Erro ao remover renda.')
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
      addToast('Erro ao salvar ganho extra.')
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
      addToast('Erro ao salvar despesa.')
    }
  }

  const removeExtra = async (id) => {
    const prev = data.monthlyData[currentMonth]?.extras || []
    updateMonth((m) => ({ ...m, extras: m.extras.filter((e) => e.id !== id) }))
    const { error } = await db.deleteExtra(userIdRef.current, id)
    if (error) {
      console.error('Erro ao remover ganho extra:', error)
      updateMonth((m) => ({ ...m, extras: prev }))
      addToast('Erro ao remover ganho extra.')
    }
  }

  const updateExtra = async (id, updates) => {
    const prev = data.monthlyData[currentMonth]?.extras || []
    updateMonth((m) => ({
      ...m,
      extras: m.extras.map((e) => (e.id === id ? { ...e, ...updates, customCategoryEmoji: updates.customCategoryEmoji } : e)),
    }))
    const { error } = await db.updateExtraEntry(userIdRef.current, id, updates)
    if (error) {
      console.error('Erro ao atualizar ganho extra:', error)
      updateMonth((m) => ({ ...m, extras: prev }))
      addToast('Erro ao atualizar ganho extra.')
    }
  }

  const updateExpense = async (id, updates) => {
    const prev = data.monthlyData[currentMonth]?.expenses || []
    updateMonth((m) => ({
      ...m,
      expenses: m.expenses.map((e) => (e.id === id ? { ...e, ...updates, customCategoryEmoji: updates.customCategoryEmoji } : e)),
    }))
    const { error } = await db.updateExpenseEntry(userIdRef.current, id, updates)
    if (error) {
      console.error('Erro ao atualizar despesa:', error)
      updateMonth((m) => ({ ...m, expenses: prev }))
      addToast('Erro ao atualizar despesa.')
    }
  }

  const removeExpense = async (id) => {
    const prev = data.monthlyData[currentMonth]?.expenses || []
    updateMonth((m) => ({ ...m, expenses: m.expenses.filter((e) => e.id !== id) }))
    const { error } = await db.deleteExpense(userIdRef.current, id)
    if (error) {
      console.error('Erro ao remover despesa:', error)
      updateMonth((m) => ({ ...m, expenses: prev }))
      addToast('Erro ao remover despesa.')
    }
  }

  const setGoal = async (goal) => {
    const prevGoal = data.goal
    setData((prev) => ({ ...prev, goal }))
    const { error } = await db.upsertGoal(userIdRef.current, goal)
    if (error) {
      console.error('Erro ao salvar meta:', error)
      setData((prev) => ({ ...prev, goal: prevGoal }))
      addToast('Erro ao salvar meta.')
    }
  }

  const removeGoal = async () => {
    const prevGoal = data.goal
    setData((prev) => ({ ...prev, goal: null }))
    const { error } = await db.deleteGoal(userIdRef.current)
    if (error) {
      console.error('Erro ao remover meta:', error)
      setData((prev) => ({ ...prev, goal: prevGoal }))
      addToast('Erro ao remover meta.')
    }
  }

  const setBudget = async ({ category, amount }) => {
    const prev = data.budgets
    setData((d) => ({ ...d, budgets: { ...d.budgets, [category]: amount } }))
    const { error } = await db.upsertBudget(userIdRef.current, { category, amount })
    if (error) {
      console.error('Erro ao salvar orçamento:', error)
      setData((d) => ({ ...d, budgets: prev }))
      addToast('Erro ao salvar orçamento.')
    }
  }

  const removeBudget = async (category) => {
    const prev = data.budgets
    setData((d) => {
      const next = { ...d.budgets }
      delete next[category]
      return { ...d, budgets: next }
    })
    const { error } = await db.deleteBudget(userIdRef.current, category)
    if (error) {
      console.error('Erro ao remover orçamento:', error)
      setData((d) => ({ ...d, budgets: prev }))
      addToast('Erro ao remover orçamento.')
    }
  }

  const setReserve = async (reserve) => {
    const prev = data.reserve
    setData((d) => ({ ...d, reserve }))
    const { error } = await db.upsertReserve(userIdRef.current, reserve)
    if (error) {
      console.error('Erro ao salvar reserva:', error)
      setData((d) => ({ ...d, reserve: prev }))
      addToast('Erro ao salvar reserva.')
    }
  }

  const removeReserve = async () => {
    const prev = data.reserve
    setData((d) => ({ ...d, reserve: null }))
    const { error } = await db.deleteReserve(userIdRef.current)
    if (error) {
      console.error('Erro ao remover reserva:', error)
      setData((d) => ({ ...d, reserve: prev }))
      addToast('Erro ao remover reserva.')
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
      addToast('Erro ao salvar despesa fixa.')
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
      addToast('Erro ao remover despesa fixa.')
    }
  }

  const updateRecurring = async (id, updates) => {
    const prevRecurring = data.recurring
    setData((prev) => ({ ...prev, recurring: prev.recurring.map((r) => (r.id === id ? { ...r, ...updates } : r)) }))
    const { error } = await db.updateRecurringEntry(id, updates)
    if (error) {
      console.error('Erro ao atualizar despesa fixa:', error)
      setData((prev) => ({ ...prev, recurring: prevRecurring }))
      addToast('Erro ao atualizar despesa fixa.')
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
      addToast('Erro ao atualizar despesa fixa.')
    }
  }

  const togglePaidExpense = async (id) => {
    const wasPaid = (data.monthlyData[currentMonth]?.expenses || []).find((e) => e.id === id)?.paid || false
    updateMonth((m) => ({ ...m, expenses: m.expenses.map((e) => (e.id === id ? { ...e, paid: !wasPaid } : e)) }))
    const { error } = await db.setExpensePaid(userIdRef.current, id, !wasPaid)
    if (error) {
      console.error('Erro ao marcar como pago:', error)
      updateMonth((m) => ({ ...m, expenses: m.expenses.map((e) => (e.id === id ? { ...e, paid: wasPaid } : e)) }))
      addToast('Erro ao marcar como pago.')
    }
  }

  const togglePaidRecurring = async (id) => {
    const cur = data.paidRecurring[currentMonth] || []
    const wasPaid = cur.includes(id)
    setData((prev) => {
      const curIds = prev.paidRecurring[currentMonth] || []
      const next = curIds.includes(id) ? curIds.filter((d) => d !== id) : [...curIds, id]
      return { ...prev, paidRecurring: { ...prev.paidRecurring, [currentMonth]: next } }
    })
    const { error } = wasPaid
      ? await db.unmarkRecurringPaid(userIdRef.current, currentMonth, id)
      : await db.markRecurringPaid(userIdRef.current, currentMonth, id)
    if (error) {
      console.error('Erro ao marcar fixa como paga:', error)
      setData((prev) => ({ ...prev, paidRecurring: { ...prev.paidRecurring, [currentMonth]: cur } }))
      addToast('Erro ao marcar como pago.')
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
      addToast('Erro ao atualizar cartão.')
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

  const movimentacoesNet = totalExtras - variableExpensesTotal

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
        const ok = await askConfirm('Isso vai substituir TODOS os dados atuais. Continuar?', 'Substituir tudo')
        if (ok) {
          const migrated = migrateData(parsed)
          setData(migrated)
          const { error } = await db.replaceAllData(userIdRef.current, migrated)
          if (error) {
            console.error('Erro ao importar backup:', error)
            addToast('Dados importados localmente, mas houve erro ao salvar no servidor. Recarregue a página.')
          } else {
            addToast('Backup restaurado com sucesso.', 'success')
          }
        }
      } catch { addToast('Arquivo de backup inválido.') }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  if (!loaded) return <DashboardSkeleton />

  const hero = splitBRL(balance)
  const insightIcon = { good: Lightbulb, warn: TrendingUp, bad: TrendingDown, info: Lightbulb }

  return (
    <div className="wrap">
      {/* top bar */}
      <header className="topbar reveal">
        <div className="brand">
          <span className="logo"><span className="dot" />Fin<em style={{ fontStyle: 'normal', color: 'var(--accent-ink)' }}>Track</em></span>
          {!isEmpty && <span className={`status-pill ${health.cls}`}>{health.label}</span>}
        </div>
        <div className="topbar-right">
          <button className="icon-btn" title="Tema" onClick={toggleTheme} aria-label="Alternar tema">
            {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
          </button>
          <button className="icon-btn" title="Sair" onClick={handleLogout} disabled={loggingOut} aria-label="Sair">
            <LogOut size={17} />
          </button>
        </div>
      </header>

      {/* masthead */}
      <div className="masthead reveal" style={{ animationDelay: '.04s' }}>
        <h1>Suas <em>finanças</em><br />do mês</h1>
        <div className="month-nav">
          <button className="arrow" onClick={() => changeMonth(-1)} aria-label="Mês anterior"><ChevronLeft size={18} /></button>
          <span className="label">{monthLabel(currentMonth)}</span>
          <button className="arrow" onClick={() => changeMonth(1)} aria-label="Próximo mês"><ChevronRight size={18} /></button>
        </div>
      </div>

      {!isEmpty && (
        <nav className="tabs reveal" style={{ animationDelay: '.08s' }}>
          <button className={'tab' + (tab === 'panorama' ? ' active' : '')} onClick={() => setTab('panorama')}>Panorama</button>
          <button className={'tab' + (tab === 'ajustes' ? ' active' : '')} onClick={() => setTab('ajustes')}>Ajustes</button>
        </nav>
      )}

      {isEmpty ? (
        <div style={{ marginTop: 24 }}>
          <EmptyState onAddIncome={() => setModal('income')} onAddExpense={() => setModal('expense')} />
        </div>
      ) : tab === 'panorama' ? (
        <div className="grid">
          {/* ---------- LEFT ---------- */}
          <div className="col">
            {/* hero saldo */}
            <section className="card hero reveal" style={{ animationDelay: '.12s' }}>
              <div className="eyebrow" style={{ marginBottom: 14 }}>{isRed ? 'No vermelho' : 'Saldo do mês'}</div>
              <div className="hero-row">
                <div>
                  <div className={'amount' + (isRed ? ' debt' : '')}>
                    <span className="cur">R$</span>
                    <span>{isRed ? '−' : ''}{hero.reais}<span className="cents">,{hero.cents}</span></span>
                  </div>
                  <div className="hero-sub">
                    <span><b>{formatBRL(totalIncome)}</b> entrou</span>
                    <span style={{ color: 'var(--faint)' }}>·</span>
                    <span><b>{formatBRL(totalExpenses)}</b> saiu</span>
                    {balanceDelta !== 0 && (
                      <span className={'delta ' + (balanceDelta > 0 ? 'up' : 'down')}>
                        {balanceDelta > 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                        {formatBRL(Math.abs(balanceDelta))} vs. {prevMonthShort}
                      </span>
                    )}
                  </div>
                </div>
                <Sparkline values={sparkValues} />
              </div>
              <div className="renda-line">
                <span className="lbl">
                  Renda principal
                  {data.incomeHistory.length > 1 && (
                    <span className="hist" onClick={() => setModal('incomeHistory')}>{data.incomeHistory.length} alterações no histórico</span>
                  )}
                </span>
                <span className="val">
                  <span className="mono" style={{ fontSize: 15, fontWeight: 500 }}>{formatBRL(mainIncome)}</span>
                  <button className="linkbtn" onClick={() => setModal('income')}>{mainIncome > 0 ? 'Editar' : 'Definir'}</button>
                </span>
              </div>
            </section>

            {/* insights */}
            {insights.length > 0 && (
              <div className="chips reveal" style={{ animationDelay: '.16s' }}>
                {insights.map((ins) => {
                  const Ic = insightIcon[ins.tone] || Lightbulb
                  const cls = ins.tone === 'bad' ? 'bad' : ins.tone === 'warn' ? 'warn' : 'good'
                  return (
                    <div className={`chip ${cls}`} key={ins.id}>
                      <span className="ic"><Ic size={16} /></span>
                      <span>{ins.text}</span>
                    </div>
                  )
                })}
              </div>
            )}

            {/* fluxo */}
            <section className="card reveal" style={{ animationDelay: '.2s' }}>
              <div className="flow-split">
                <div className="flow-item">
                  <div className="eyebrow"><TrendingUp size={13} /> Entradas</div>
                  <div className="v">{formatBRL(totalIncome)}</div>
                  <div className="meta">Renda + {monthData.extras.length} {monthData.extras.length === 1 ? 'extra' : 'extras'}</div>
                </div>
                <div className="divider" />
                <div className="flow-item">
                  <div className="eyebrow"><TrendingDown size={13} /> Saídas</div>
                  <div className="v">{formatBRL(totalExpenses)}</div>
                  <div className="meta">{activeRecurring.length} fixas + {monthData.expenses.length} variáveis</div>
                </div>
              </div>
              {totalIncome > 0 && (
                <div className="bar-wrap">
                  <div className="bar-head">
                    <span style={{ color: 'var(--muted)' }}>Renda comprometida</span>
                    <span className="pct">{Math.round(committedPct * 100)}%</span>
                  </div>
                  <div className="bar">
                    <span className={committedPct >= 1 ? 'debt' : committedPct >= 0.9 ? 'warn' : ''} style={{ width: `${Math.min(committedPct, 1) * 100}%` }} />
                  </div>
                  <div className="bar-foot">
                    {committedPct >= 1
                      ? 'Você gastou mais do que ganhou este mês.'
                      : <>Sobram <b>{formatBRL(totalIncome - totalExpenses)}</b> da sua renda.</>}
                  </div>
                </div>
              )}
            </section>

            {/* gastos por categoria */}
            {chartData.length > 0 && (
              <section className="card reveal" style={{ animationDelay: '.24s' }}>
                <div className="card-head"><div className="eyebrow"><BarChart3 size={13} /> Gastos por categoria</div></div>
                <div className="donut-wrap">
                  <DonutChart data={chartData} total={totalExpenses} />
                  <div className="legend">
                    {chartData.map((s) => (
                      <div className="legend-row" key={s.id}>
                        <span className="sw" style={{ background: s.color }} />
                        <span className="nm">{s.emoji} {s.label}</span>
                        <span className="pc">{Math.round((s.value / totalExpenses) * 100)}%</span>
                        <span className="vl">{formatBRL(s.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* meta poupança */}
            <section className="card reveal" style={{ animationDelay: '.28s' }}>
              <div className="card-head">
                <div className="eyebrow"><Target size={13} /> Meta de poupança</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="linkbtn" onClick={() => setModal('goal')}>{goalInfo ? 'Editar' : 'Definir'}</button>
                  {goalInfo && (
                    <button className="linkbtn danger" onClick={() => askConfirm('Excluir a meta de poupança?', 'Excluir').then((ok) => { if (ok) removeGoal() })}>Excluir</button>
                  )}
                </div>
              </div>
              {goalInfo ? (
                <div className="meta-card">
                  <ProgressRing progress={goalInfo.progress} />
                  <div className="meta-info">
                    <div className="amt">{formatBRL(goalInfo.saved)}</div>
                    <div className="of">de {formatBRL(goalInfo.totalAmount)} · termina em {monthLabel(goalInfo.endMonth)}</div>
                    <div className="note">
                      {goalInfo.done
                        ? `Meta batida! Você juntou ${formatBRL(goalInfo.saved)}. 🎉`
                        : goalInfo.notStarted
                        ? `Começa em ${monthLabel(goalInfo.startMonth)}.`
                        : goalInfo.ended
                        ? `Período encerrado. Juntou ${formatBRL(goalInfo.saved)}.`
                        : `Faltam ${formatBRL(goalInfo.remainingAmount)}${goalInfo.monthsRemaining > 0 ? ` · ${formatBRL(goalInfo.requiredRate)}/mês` : ''}`}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="empty-box">Sem meta definida. Diga quanto quer juntar e em quantos meses — o app acumula o que sobra de cada mês.</div>
              )}
            </section>
          </div>

          {/* ---------- RIGHT ---------- */}
          <div className="col">
            {/* despesas fixas */}
            <section className="card reveal" style={{ animationDelay: '.14s' }}>
              <div className="card-head">
                <div className="eyebrow"><Repeat size={13} /> Despesas fixas</div>
                <button className="btn-ghost" style={{ padding: '6px 12px' }} onClick={() => setModal('recurring')}><Plus size={14} /> Adicionar</button>
              </div>
              <div className="ledger-head">
                <div>
                  <div className="ledger-total">{formatBRL(recurringTotal)}</div>
                  <div className="ledger-sub">{activeRecurring.length} de {data.recurring.length} ativas neste mês</div>
                  {activeRecurring.length > 0 && (
                    pendingRecurring.length > 0
                      ? <div className="ledger-sub pending">{pendingRecurring.length} a pagar · faltam {formatBRL(pendingRecurringTotal)}</div>
                      : <div className="ledger-sub done"><Check size={12} /> tudo pago neste mês</div>
                  )}
                </div>
              </div>
              {data.recurring.length > 0 ? (
                <div className="rows">
                  {data.recurring.map((r) => {
                    const cat = findCategory(r.category)
                    const col = cat?.color || '#8a8378'
                    const card = r.cardId ? findCard(r.cardId) : null
                    const off = disabledIds.includes(r.id)
                    const isPaid = paidRecurringIds.includes(r.id)
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
                      <div className={'row' + (off ? ' off' : '') + (isPaid && !off ? ' paid-row' : '')} key={r.id}>
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
                          {!off && (
                            <button
                              className={'paidbtn' + (isPaid ? ' paid' : '')}
                              onClick={() => togglePaidRecurring(r.id)}
                              aria-pressed={isPaid}
                              title={isPaid ? 'Pago — clique para marcar como pendente' : 'Marcar como pago'}
                            >
                              <Check size={13} />
                              <span className="lbl">{isPaid ? 'Pago' : 'Pagar'}</span>
                            </button>
                          )}
                          <button className={'toggle' + (off ? '' : ' on')} onClick={() => toggleRecurringForMonth(r.id)} title={off ? 'Pausada' : 'Ativa'} />
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
                <div className="empty-box">Cadastre aluguel, internet, assinaturas. Cada uma conta automaticamente todo mês.</div>
              )}
            </section>

            {/* movimentações */}
            <section className="card reveal" style={{ animationDelay: '.18s' }}>
              <div className="card-head">
                <div>
                  <div className="eyebrow">Movimentações do mês</div>
                  <div className="ledger-sub" style={{ marginTop: 4 }}>Ganhos extras e despesas variáveis</div>
                </div>
              </div>
              {allTransactions.length > 0 && (
                <div className="ledger-head">
                  <div>
                    <div className="ledger-total" style={{ color: movimentacoesNet >= 0 ? 'var(--accent-ink)' : 'var(--debt)' }}>
                      {movimentacoesNet >= 0 ? '+ ' : '− '}{formatBRL(Math.abs(movimentacoesNet))}
                    </div>
                    <div className="ledger-sub">{formatBRL(totalExtras)} em ganhos − {formatBRL(variableExpensesTotal)} em despesas</div>
                    {monthData.expenses.length > 0 && (
                      pendingExpenses.length > 0
                        ? <div className="ledger-sub pending">{pendingExpenses.length} despesa{pendingExpenses.length === 1 ? '' : 's'} a pagar · faltam {formatBRL(pendingExpensesTotal)}</div>
                        : <div className="ledger-sub done"><Check size={12} /> despesas do mês pagas</div>
                    )}
                  </div>
                </div>
              )}
              {allTransactions.length > 0 ? (
                <div className="rows">
                  {allTransactions.map((t) => {
                    const pos = t.type === 'extra'
                    const cat = findCategory(t.category)
                    const col = pos ? 'var(--accent)' : (cat?.color || '#8a8378')
                    const card = t.cardId ? findCard(t.cardId) : null
                    return (
                      <div className={'row' + (!pos && t.paid ? ' paid-row' : '')} key={`${t.type}-${t.id}`}>
                        <div className="main">
                          <span className="ic-cell" style={{ background: `color-mix(in oklab, ${col} 16%, transparent)`, color: col }}>
                            {pos ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                          </span>
                          <div style={{ minWidth: 0 }}>
                            <div className="nm">{t.description}</div>
                            <div className="tag">
                              <span>{new Date(t.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</span>
                              <span className="sep">·</span>
                              <span>{pos ? 'ganho extra' : (cat?.label || 'Outros')}</span>
                              {card && (<><span className="sep">·</span><span>{card.name}</span></>)}
                            </div>
                          </div>
                        </div>
                        <div className={'amt ' + (pos ? 'pos' : 'neg')}>{pos ? '+' : '−'} {formatBRL(t.amount)}</div>
                        <div className="row-end">
                          {!pos && (
                            <button
                              className={'paidbtn' + (t.paid ? ' paid' : '')}
                              onClick={() => togglePaidExpense(t.id)}
                              aria-pressed={!!t.paid}
                              title={t.paid ? 'Pago — clique para marcar como pendente' : 'Marcar como pago'}
                            >
                              <Check size={13} />
                              <span className="lbl">{t.paid ? 'Pago' : 'Pagar'}</span>
                            </button>
                          )}
                          <div className="row-actions">
                            <button onClick={() => setEditingTransaction(t)} aria-label="Editar"><Pencil size={14} /></button>
                            <button className="del" onClick={() => pos ? removeExtra(t.id) : removeExpense(t.id)} aria-label="Remover"><Trash2 size={14} /></button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="empty-box">Ainda nada por aqui. Use o botão + pra lançar um ganho extra ou uma despesa.</div>
              )}
            </section>
          </div>
        </div>
      ) : (
        /* ---------- AJUSTES ---------- */
        <div className="set-grid reveal" style={{ animationDelay: '.1s' }}>
          {/* reserva */}
          <section className="card set-card">
            <div className="card-head">
              <div className="eyebrow"><Shield size={13} /> Reserva de emergência</div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="linkbtn" onClick={() => setModal('reserve')}>{reserveInfo ? 'Editar' : 'Definir'}</button>
                {reserveInfo && (
                  <button className="linkbtn danger" onClick={() => askConfirm('Excluir a reserva de emergência?', 'Excluir').then((ok) => { if (ok) removeReserve() })}>Excluir</button>
                )}
              </div>
            </div>
            {reserveInfo ? (
              <div className="meta-card">
                <ProgressRing progress={reserveInfo.progress} />
                <div className="meta-info">
                  <div className="amt">{formatBRL(reserveInfo.currentAmount)}</div>
                  <div className="of">de {formatBRL(reserveInfo.target)} · {reserveInfo.targetMonths} {reserveInfo.targetMonths === 1 ? 'mês' : 'meses'} de fixas</div>
                  <div className="note">
                    {reserveInfo.done
                      ? `Reserva completa! Cobre ${reserveInfo.targetMonths} ${reserveInfo.targetMonths === 1 ? 'mês' : 'meses'}. 🛟`
                      : reserveInfo.monthlyNeed > 0
                      ? `Cobre ${reserveInfo.monthsCovered.toFixed(1)} meses hoje · faltam ${formatBRL(reserveInfo.remaining)}`
                      : 'Cadastre suas despesas fixas pra calcular a meta.'}
                  </div>
                </div>
              </div>
            ) : (
              <>
                <p>Sem reserva definida. Guarde o equivalente a alguns meses de despesa fixa pra imprevistos — perda de renda, conserto inesperado. Diga quanto já tem e quantos meses quer cobrir.</p>
                <div className="empty-box">Sugestão: com {formatBRL(recurringTotal)}/mês de fixas, uma reserva de 3 meses seria ~{formatBRL(recurringTotal * 3)}.</div>
              </>
            )}
          </section>

          {/* cartões */}
          <section className="card set-card">
            <div className="card-head">
              <div className="eyebrow"><CreditCard size={13} /> Cartões</div>
              <button className="btn-ghost" style={{ padding: '6px 12px' }} onClick={() => setModal('cards')}><Plus size={14} /> Gerenciar</button>
            </div>
            <p>Marque o cartão ao lançar despesas pra ver pra onde a grana tá indo.</p>
            {userCards.length > 0 ? (
              <div className="cards-list">
                {userCards.map((c) => (
                  <span className="card-pill" key={c.id}><BankLogo id={c.id} size={22} />{c.name}</span>
                ))}
              </div>
            ) : (
              <div className="empty-box">Cadastre os bancos/cartões que você usa (Nubank, Santander, C6, etc).</div>
            )}
          </section>

          {/* orçamentos */}
          <section className="card set-card">
            <div className="card-head">
              <div className="eyebrow"><Wallet size={13} /> Orçamentos</div>
              {unbudgetedCategories.length > 0 && (
                <button className="btn-ghost" style={{ padding: '6px 12px' }} onClick={() => setModal('budget')}><Plus size={14} /> Adicionar</button>
              )}
            </div>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 18, color: 'var(--ink)', fontWeight: 500, margin: '2px 0 4px' }}>
              {budgetList.length} {budgetList.length === 1 ? 'categoria' : 'categorias'}
            </p>
            {budgetList.length > 0 ? (
              <div style={{ marginTop: 8 }}>
                {budgetList.map((b) => {
                  const over = b.spent > b.limit
                  const near = !over && b.pct >= 0.8
                  return (
                    <div className="budget-item" key={b.catId}>
                      <div className="top">
                        <span className="nm">{b.emoji} {b.label}</span>
                        <span className="vals">
                          <span style={over ? { color: 'var(--debt)' } : undefined}>{formatBRL(b.spent)}</span>
                          <span className="lim">/ {formatBRL(b.limit)}</span>
                          <button className="linkbtn" onClick={() => setEditingBudget({ category: b.catId, amount: b.limit })}><Pencil size={12} /></button>
                          <button className="linkbtn danger" onClick={() => askConfirm(`Remover o orçamento de ${b.label}?`, 'Remover').then((ok) => { if (ok) removeBudget(b.catId) })}><Trash2 size={12} /></button>
                        </span>
                      </div>
                      <div className="bar"><span className={over ? 'debt' : near ? 'warn' : ''} style={{ width: `${Math.min(b.pct, 1) * 100}%` }} /></div>
                      <div className="foot" style={over ? { color: 'var(--debt)' } : near ? { color: 'var(--warn)' } : undefined}>
                        {over ? `Passou ${formatBRL(b.spent - b.limit)} do teto.` : `Sobram ${formatBRL(b.limit - b.spent)} este mês.`}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <>
                <p>Defina um teto mensal e acompanhe quanto já gastou.</p>
                <div className="empty-box">Ex.: teto de Alimentação R$ 800 → o app mostra uma barra de quanto você já comprometeu no mês.</div>
              </>
            )}
          </section>

          {/* backup */}
          <section className="card set-card">
            <div className="card-head"><div className="eyebrow"><Download size={13} /> Backup completo</div></div>
            <p>Salva tudo num arquivo JSON. Útil pra mover de PC ou guardar uma cópia segura.</p>
            <div className="backup-btns">
              <button className="btn-ghost" onClick={exportBackup}><Download size={15} /> Salvar backup</button>
              <button className="btn-ghost" onClick={() => fileInputRef.current?.click()}><Upload size={15} /> Restaurar backup</button>
              <input type="file" accept=".json" ref={fileInputRef} onChange={importBackup} style={{ display: 'none' }} />
            </div>
          </section>
        </div>
      )}

      {/* FAB */}
      {!isEmpty && (
        <div className="fab-zone">
          {fabOpen && (
            <div className="fab-menu">
              <button className="fab-action in" onClick={() => { setModal('extra'); setFabOpen(false) }}>
                <TrendingUp size={17} /> Ganho extra
              </button>
              <button className="fab-action out" style={{ animationDelay: '.05s' }} onClick={() => { setModal('expense'); setFabOpen(false) }}>
                <TrendingDown size={17} /> Despesa
              </button>
            </div>
          )}
          <button className={'fab' + (fabOpen ? ' open' : '')} onClick={() => setFabOpen((o) => !o)} title="Adicionar" aria-label="Adicionar">
            <Plus size={26} strokeWidth={2.2} />
          </button>
        </div>
      )}

      {/* Modals */}
      {modal === 'cards' ? (
        <CardsModal onClose={() => setModal(null)} activeCards={data.cards} onToggle={toggleCard} />
      ) : modal === 'incomeHistory' ? (
        <IncomeHistoryModal onClose={() => setModal(null)} incomeHistory={data.incomeHistory} onRemove={(sm) => askConfirm(`Remover renda de ${monthLabel(sm)}?`, 'Remover').then((ok) => { if (ok) removeIncomeEntry(sm) })} onEdit={(entry) => { setEditingIncome(entry); setModal(null) }} />
      ) : modal ? (
        <Modal type={modal} initialValues={modal === 'goal' ? data.goal : modal === 'reserve' ? data.reserve : null} onClose={() => setModal(null)} currentIncome={mainIncome} userCards={userCards} currentViewedMonth={currentMonth}
          onSubmit={(payload) => {
            if (modal === 'income') setIncomeEntry(payload)
            else if (modal === 'extra') addExtra(payload)
            else if (modal === 'expense') addExpense(payload)
            else if (modal === 'goal') setGoal(payload)
            else if (modal === 'recurring') addRecurring(payload)
            else if (modal === 'budget') setBudget(payload)
            else if (modal === 'reserve') setReserve(payload)
            setModal(null)
          }}
        />
      ) : null}

      {editingBudget && (
        <Modal type="budget" initialValues={editingBudget} onClose={() => setEditingBudget(null)} currentIncome={mainIncome} userCards={userCards} currentViewedMonth={currentMonth}
          onSubmit={(payload) => { setBudget(payload); setEditingBudget(null) }}
        />
      )}

      {editingIncome && (
        <Modal type="income" initialValues={editingIncome} onClose={() => setEditingIncome(null)} currentIncome={editingIncome.amount} userCards={userCards} currentViewedMonth={currentMonth}
          onSubmit={(payload) => {
            if (editingIncome.startMonth !== payload.startMonth) removeIncomeEntry(editingIncome.startMonth)
            setIncomeEntry(payload)
            setEditingIncome(null)
          }}
        />
      )}

      {editingRecurring && (
        <Modal type="recurring" initialValues={editingRecurring} onClose={() => setEditingRecurring(null)} currentIncome={mainIncome} userCards={userCards} currentViewedMonth={currentMonth}
          onSubmit={(payload) => { updateRecurring(editingRecurring.id, payload); setEditingRecurring(null) }}
        />
      )}

      {editingTransaction && (
        <Modal type={editingTransaction.type} initialValues={editingTransaction} onClose={() => setEditingTransaction(null)} currentIncome={mainIncome} userCards={userCards} currentViewedMonth={currentMonth}
          onSubmit={(payload) => {
            if (editingTransaction.type === 'extra') updateExtra(editingTransaction.id, payload)
            else updateExpense(editingTransaction.id, payload)
            setEditingTransaction(null)
          }}
        />
      )}

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      <ConfirmDialog
        state={confirmState}
        onConfirm={() => resolveConfirm(true)}
        onCancel={() => resolveConfirm(false)}
      />
    </div>
  )
}
