'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Plus, TrendingUp, TrendingDown, ChevronLeft, ChevronRight,
  Trash2, Target, Repeat, Download, BarChart3, CreditCard,
  Upload, Sun, Moon, Pencil, LogOut, Lightbulb, Shield, Wallet, CalendarClock,
} from 'lucide-react'

import { supabase } from '@/lib/supabase'
import * as db from '@/lib/db'
import { CATEGORIES, THEME_KEY } from '@/lib/constants'
import {
  formatBRL, monthKey, monthLabel, emptyMonth, shiftMonth, computeMonthSummary,
  findCategory, findCard, migrateData, getInstallmentInfo, computeGoalProgress,
  computeInsights, computeReserveProgress, spendByCategory,
} from '@/lib/helpers'

import BankLogo from './BankLogo'
import Modal from './Modal'
import CardsModal from './CardsModal'
import IncomeHistoryModal from './IncomeHistoryModal'
import ToastContainer from './Toast'
import ConfirmDialog from './ConfirmDialog'
import ProgressRing from './ProgressRing'
import DonutChart from './DonutChart'
import CountUp from './CountUp'
import Sparkline from './Sparkline'
import DashboardSkeleton from './DashboardSkeleton'
import EmptyState from './EmptyState'

export default function FinanceTracker() {
  const [currentMonth, setCurrentMonth] = useState(monthKey(new Date()))
  const [data, setData] = useState({
    monthlyData: {}, recurring: [], goal: null, disabledRecurring: {}, cards: [], incomeHistory: [],
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
  const sparkValues = Array.from({ length: 6 }, (_, i) =>
    computeMonthSummary(data, shiftMonth(currentMonth, i - 5)).balance
  )
  const committedPct = totalIncome > 0 ? totalExpenses / totalIncome : 0
  const health = isRed
    ? { label: 'No vermelho', cls: 'bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300' }
    : goalInfo?.done
    ? { label: 'Meta batida', cls: 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300' }
    : committedPct >= 0.9
    ? { label: 'Atenção', cls: 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300' }
    : { label: 'Tranquilo', cls: 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300' }

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
      return { catId, label: cat?.label || 'Outros', emoji: cat?.emoji || '📦', color: cat?.color || '#78716c', limit, spent, pct: limit > 0 ? spent / limit : 0 }
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

  // ── Blocos reaproveitados nas abas ───────────────────────────────

  const saldoCard = (
    <div className={`rounded-3xl p-6 mb-3 border ${isRed ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-100 dark:border-rose-900/40' : 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-900/40'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.2em] text-stone-500 dark:text-stone-400 mb-2">{isRed ? 'No vermelho' : 'Saldo do mês'}</p>
          <p className={`text-5xl mb-2 font-mono tracking-tight ${isRed ? 'text-rose-900 dark:text-rose-300' : 'text-emerald-900 dark:text-emerald-300'}`}>
            <CountUp value={balance} format={formatBRL} />
          </p>
        </div>
        <div className="flex-shrink-0 pt-1">
          <Sparkline values={sparkValues} />
        </div>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <p className="text-sm text-stone-600 dark:text-stone-400">{formatBRL(totalIncome)} entrou · {formatBRL(totalExpenses)} saiu</p>
        {balanceDelta !== 0 && (
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${balanceDelta > 0 ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300' : 'bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300'}`}>
            {balanceDelta > 0 ? '↑' : '↓'} {formatBRL(Math.abs(balanceDelta))} vs. {monthLabel(shiftMonth(currentMonth, -1)).split(' de ')[0]}
          </span>
        )}
      </div>
    </div>
  )

  const insightsCard = insights.length > 0 && (
    <div className="space-y-2 mb-3">
      {insights.map((ins) => {
        const tone = {
          good: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-300',
          warn: 'bg-amber-50 dark:bg-amber-950/30 border-amber-100 dark:border-amber-900/40 text-amber-800 dark:text-amber-300',
          bad: 'bg-rose-50 dark:bg-rose-950/30 border-rose-100 dark:border-rose-900/40 text-rose-800 dark:text-rose-300',
          info: 'bg-stone-50 dark:bg-stone-900 border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300',
        }[ins.tone] || ''
        return (
          <div key={ins.id} className={`flex items-start gap-2.5 rounded-2xl border px-4 py-3 animate-fade-in-up ${tone}`}>
            <Lightbulb size={15} className="flex-shrink-0 mt-0.5" />
            <p className="text-sm leading-snug">{ins.text}</p>
          </div>
        )
      })}
    </div>
  )

  const entradasSaidasCard = (
    <div className="grid grid-cols-2 gap-3 mb-3">
      <div className="bg-white dark:bg-stone-900 rounded-2xl p-4 border border-stone-200 dark:border-stone-800">
        <div className="flex items-center gap-2 text-stone-500 dark:text-stone-400 text-[10px] uppercase tracking-[0.15em] mb-2"><TrendingUp size={12} /> Entradas</div>
        <p className="text-2xl font-mono"><CountUp value={totalIncome} format={formatBRL} /></p>
        <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">Renda + {monthData.extras.length} {monthData.extras.length === 1 ? 'extra' : 'extras'}</p>
      </div>
      <div className="bg-white dark:bg-stone-900 rounded-2xl p-4 border border-stone-200 dark:border-stone-800">
        <div className="flex items-center gap-2 text-stone-500 dark:text-stone-400 text-[10px] uppercase tracking-[0.15em] mb-2"><TrendingDown size={12} /> Saídas</div>
        <p className="text-2xl font-mono"><CountUp value={totalExpenses} format={formatBRL} /></p>
        <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">{activeRecurring.length} fixas + {monthData.expenses.length} variáveis</p>
      </div>
    </div>
  )

  const committedCard = totalIncome > 0 && (
    <div className="bg-white dark:bg-stone-900 rounded-2xl p-4 border border-stone-200 dark:border-stone-800 mb-3">
      <div className="flex items-center justify-between mb-2 text-xs">
        <span className="text-stone-500 dark:text-stone-400">Renda comprometida</span>
        <span className="font-medium">{Math.round(committedPct * 100)}%</span>
      </div>
      <div className="h-2 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${committedPct >= 1 ? 'bg-rose-600' : committedPct >= 0.9 ? 'bg-amber-500' : 'bg-emerald-600'}`}
          style={{ width: `${Math.min(committedPct, 1) * 100}%` }}
        />
      </div>
      <p className="text-xs text-stone-500 dark:text-stone-400 mt-2">
        {committedPct >= 1
          ? 'Você gastou mais do que ganhou este mês.'
          : `Sobram ${formatBRL(totalIncome - totalExpenses)} da sua renda.`}
      </p>
    </div>
  )

  const chartCard = chartData.length > 0 && (
    <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-5 mb-3">
      <div className="flex items-center gap-2 mb-4"><BarChart3 size={14} className="text-stone-500 dark:text-stone-400" /><p className="text-[10px] uppercase tracking-[0.15em] text-stone-500 dark:text-stone-400">Gastos por categoria</p></div>
      <div className="flex flex-col sm:flex-row items-center gap-5">
        <div className="relative flex-shrink-0">
          <DonutChart data={chartData} total={totalExpenses} />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[9px] uppercase tracking-[0.15em] text-stone-400 dark:text-stone-500">Total</span>
            <span className="text-sm font-mono font-semibold">{formatBRL(totalExpenses)}</span>
          </div>
        </div>
        <ul className="flex-1 w-full space-y-2 min-w-0">
          {chartData.map((c) => {
            const pct = Math.round((c.value / totalExpenses) * 100)
            return (
              <li key={c.id} className="flex items-center gap-2 text-sm">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: c.color }} />
                <span className="flex-shrink-0">{c.emoji}</span>
                <span className="text-stone-700 dark:text-stone-300 truncate flex-1">{c.label}</span>
                <span className="text-xs text-stone-400 dark:text-stone-500 flex-shrink-0">{pct}%</span>
                <span className="font-medium text-stone-900 dark:text-stone-100 whitespace-nowrap">{formatBRL(c.value)}</span>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )

  const metaCard = (
    <div className="bg-white dark:bg-stone-900 rounded-2xl p-5 border border-stone-200 dark:border-stone-800 mb-3">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Target size={14} className="text-stone-500 dark:text-stone-400" />
          <p className="text-[10px] uppercase tracking-[0.15em] text-stone-500 dark:text-stone-400">Meta de poupança</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setModal('goal')} className="text-xs text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white underline-offset-4 hover:underline">
            {goalInfo ? 'Editar' : 'Definir'}
          </button>
          {goalInfo && (
            <button
              onClick={() => askConfirm('Excluir a meta de poupança?', 'Excluir').then((ok) => { if (ok) removeGoal() })}
              className="text-xs text-stone-500 dark:text-stone-400 hover:text-rose-600 dark:hover:text-rose-500 underline-offset-4 hover:underline"
            >
              Excluir
            </button>
          )}
        </div>
      </div>
      {goalInfo ? (
        <div className="flex items-center gap-4">
          <div className="relative flex-shrink-0">
            <ProgressRing progress={goalInfo.progress} done={goalInfo.done} />
            <span className="absolute inset-0 flex items-center justify-center text-sm font-mono font-semibold">
              {Math.round(goalInfo.progress * 100)}%
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-2xl font-mono">
              {formatBRL(goalInfo.saved)}{' '}
              <span className="text-sm font-sans text-stone-500 dark:text-stone-400">de {formatBRL(goalInfo.totalAmount)}</span>
            </p>
            <p className="text-[11px] text-stone-400 dark:text-stone-500 mt-0.5 capitalize">
              {goalInfo.months} {goalInfo.months === 1 ? 'mês' : 'meses'} · termina em {monthLabel(goalInfo.endMonth)}
            </p>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
              {goalInfo.done
                ? `Meta batida! Você juntou ${formatBRL(goalInfo.saved)}. 🎉`
                : goalInfo.notStarted
                ? `A meta começa em ${monthLabel(goalInfo.startMonth)}.`
                : goalInfo.ended
                ? `Período encerrado. Você juntou ${formatBRL(goalInfo.saved)} de ${formatBRL(goalInfo.totalAmount)}.`
                : `Faltam ${formatBRL(goalInfo.remainingAmount)}${goalInfo.monthsRemaining > 0 ? ` · ${goalInfo.monthsRemaining} ${goalInfo.monthsRemaining === 1 ? 'mês' : 'meses'} restantes (${formatBRL(goalInfo.requiredRate)}/mês)` : ' até o fim do período'}`}
            </p>
          </div>
        </div>
      ) : (
        <p className="text-sm text-stone-500 dark:text-stone-400">Sem meta definida. Diga quanto quer juntar e em quantos meses — o app acumula o que sobra de cada mês ao longo do período.</p>
      )}
    </div>
  )

  const fixasCard = (
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
              <li key={r.id} className={`p-4 flex items-center justify-between gap-3 transition animate-fade-in-up ${isDisabled ? 'opacity-40' : ''}`}>
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-9 h-9 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center flex-shrink-0">
                    <span className="text-base">{displayEmoji}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-medium truncate ${isDisabled ? 'line-through' : ''}`}>{r.description}</p>
                    <p className="text-xs text-stone-500 dark:text-stone-400 flex items-center gap-1.5 flex-wrap">
                      <span>{cat?.label || 'Outros'}</span>
                      {installInfo && (<><span>·</span><span className={installInfo.remaining <= 0 ? 'text-emerald-600 dark:text-emerald-400' : ''}>{installInfo.total}x · {installInfo.remaining > 0 ? `${installInfo.remaining} restantes` : 'Quitado'}</span></>)}
                      {r.dueDay && (() => {
                        const live = isCurrentRealMonth && !isDisabled
                        const diff = r.dueDay - todayDay
                        const overdue = live && diff < 0
                        const dueToday = live && diff === 0
                        const soon = live && diff > 0 && diff <= 5
                        const cls = overdue ? 'text-rose-600 dark:text-rose-400 font-medium' : (dueToday || soon) ? 'text-amber-600 dark:text-amber-400 font-medium' : ''
                        const txt = overdue ? `venceu dia ${r.dueDay}` : dueToday ? 'vence hoje' : soon ? `vence em ${diff} ${diff === 1 ? 'dia' : 'dias'}` : `vence dia ${r.dueDay}`
                        return (<><span>·</span><span className={`flex items-center gap-1 ${cls}`}><CalendarClock size={11} />{txt}</span></>)
                      })()}
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
                  <button onClick={() => askConfirm(`Remover "${r.description}" das despesas fixas?`, 'Remover').then((ok) => { if (ok) removeRecurring(r.id) })} className="text-stone-300 dark:text-stone-600 hover:text-rose-600 dark:hover:text-rose-500 p-1.5 transition" aria-label="Remover"><Trash2 size={13} /></button>
                </div>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="px-5 pb-5 text-xs text-stone-500 dark:text-stone-400">Cadastre coisas como aluguel, internet, assinaturas. Cada uma conta automaticamente todo mês.</p>
      )}
    </div>
  )

  const movimentacoesCard = (
    <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 overflow-hidden mb-3">
      <div className="p-5 border-b border-stone-100 dark:border-stone-800">
        <h3 className="text-xl font-medium tracking-tight">Movimentações do mês</h3>
        <p className="text-xs text-stone-500 dark:text-stone-400">Ganhos extras e despesas variáveis</p>
      </div>
      {allTransactions.length === 0 ? (
        <div className="p-10 text-center">
          <p className="text-stone-400 dark:text-stone-500 text-sm">Ainda nada por aqui.</p>
          <p className="text-stone-400 dark:text-stone-500 text-xs mt-1">Use o botão + pra começar.</p>
        </div>
      ) : (
        <ul className="divide-y divide-stone-100 dark:divide-stone-800">
          {allTransactions.map((t) => {
            const cat = findCategory(t.category)
            const card = t.cardId ? findCard(t.cardId) : null
            const displayEmoji = t.category === 'outros' && t.customCategoryEmoji ? t.customCategoryEmoji : cat?.emoji || '📦'
            return (
              <li key={`${t.type}-${t.id}`} className="p-4 flex items-center justify-between gap-3 animate-fade-in-up">
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
                  <button onClick={() => setEditingTransaction(t)} className="text-stone-300 dark:text-stone-600 hover:text-stone-700 dark:hover:text-stone-300 p-2 transition" aria-label="Editar">
                    <Pencil size={14} />
                  </button>
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
  )

  const rendaCard = (
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
  )

  const reservaCard = (
    <div className="bg-white dark:bg-stone-900 rounded-2xl p-5 border border-stone-200 dark:border-stone-800 mb-3">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Shield size={14} className="text-stone-500 dark:text-stone-400" />
          <p className="text-[10px] uppercase tracking-[0.15em] text-stone-500 dark:text-stone-400">Reserva de emergência</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setModal('reserve')} className="text-xs text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white underline-offset-4 hover:underline">
            {reserveInfo ? 'Editar' : 'Definir'}
          </button>
          {reserveInfo && (
            <button
              onClick={() => askConfirm('Excluir a reserva de emergência?', 'Excluir').then((ok) => { if (ok) removeReserve() })}
              className="text-xs text-stone-500 dark:text-stone-400 hover:text-rose-600 dark:hover:text-rose-500 underline-offset-4 hover:underline"
            >
              Excluir
            </button>
          )}
        </div>
      </div>
      {reserveInfo ? (
        <div className="flex items-center gap-4">
          <div className="relative flex-shrink-0">
            <ProgressRing progress={reserveInfo.progress} done={reserveInfo.done} />
            <span className="absolute inset-0 flex items-center justify-center text-sm font-mono font-semibold">
              {Math.round(reserveInfo.progress * 100)}%
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-2xl font-mono">
              {formatBRL(reserveInfo.currentAmount)}{' '}
              <span className="text-sm font-sans text-stone-500 dark:text-stone-400">de {formatBRL(reserveInfo.target)}</span>
            </p>
            <p className="text-[11px] text-stone-400 dark:text-stone-500 mt-0.5">
              Meta: {reserveInfo.targetMonths} {reserveInfo.targetMonths === 1 ? 'mês' : 'meses'} de despesa fixa ({formatBRL(reserveInfo.monthlyNeed)}/mês)
            </p>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
              {reserveInfo.done
                ? `Reserva completa! Cobre ${reserveInfo.targetMonths} ${reserveInfo.targetMonths === 1 ? 'mês' : 'meses'}. 🛟`
                : reserveInfo.monthlyNeed > 0
                ? `Cobre ${reserveInfo.monthsCovered.toFixed(1)} ${reserveInfo.monthsCovered === 1 ? 'mês' : 'meses'} hoje · faltam ${formatBRL(reserveInfo.remaining)}`
                : 'Cadastre suas despesas fixas pra calcular a meta da reserva.'}
            </p>
          </div>
        </div>
      ) : (
        <p className="text-sm text-stone-500 dark:text-stone-400">Sem reserva definida. Guarde o equivalente a alguns meses de despesa fixa pra emergências (perda de renda, imprevisto). Diga quanto já tem e quantos meses quer cobrir.</p>
      )}
    </div>
  )

  const orcamentosCard = (
    <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 mb-3 overflow-hidden">
      <div className="p-5 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1"><Wallet size={14} className="text-stone-500 dark:text-stone-400" /><p className="text-[10px] uppercase tracking-[0.15em] text-stone-500 dark:text-stone-400">Orçamentos</p></div>
          <p className="text-xl font-mono">{budgetList.length} {budgetList.length === 1 ? 'categoria' : 'categorias'}</p>
          <p className="text-xs text-stone-500 dark:text-stone-400">Defina um teto mensal e acompanhe quanto já gastou</p>
        </div>
        {unbudgetedCategories.length > 0 && (
          <button onClick={() => setModal('budget')} className="px-3 py-1.5 bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs rounded-full hover:bg-stone-200 dark:hover:bg-stone-700 transition flex items-center gap-1">
            <Plus size={12} /> Adicionar
          </button>
        )}
      </div>
      {budgetList.length > 0 ? (
        <ul className="divide-y divide-stone-100 dark:divide-stone-800 border-t border-stone-100 dark:border-stone-800">
          {budgetList.map((b) => {
            const over = b.spent > b.limit
            const near = !over && b.pct >= 0.8
            const barCls = over ? 'bg-rose-600' : near ? 'bg-amber-500' : 'bg-emerald-600'
            return (
              <li key={b.catId} className="p-4 animate-fade-in-up">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-base">{b.emoji}</span>
                    <span className="text-sm font-medium truncate">{b.label}</span>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <span className={`text-sm font-mono ${over ? 'text-rose-600 dark:text-rose-400' : 'text-stone-900 dark:text-stone-100'}`}>
                      {formatBRL(b.spent)}
                    </span>
                    <span className="text-xs text-stone-400 dark:text-stone-500">/ {formatBRL(b.limit)}</span>
                    <button onClick={() => setEditingBudget({ category: b.catId, amount: b.limit })} className="text-stone-300 dark:text-stone-600 hover:text-stone-700 dark:hover:text-stone-300 p-1.5 transition" aria-label="Editar"><Pencil size={13} /></button>
                    <button onClick={() => askConfirm(`Remover o orçamento de ${b.label}?`, 'Remover').then((ok) => { if (ok) removeBudget(b.catId) })} className="text-stone-300 dark:text-stone-600 hover:text-rose-600 dark:hover:text-rose-500 p-1.5 transition" aria-label="Remover"><Trash2 size={13} /></button>
                  </div>
                </div>
                <div className="h-2 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-500 ${barCls}`} style={{ width: `${Math.min(b.pct, 1) * 100}%` }} />
                </div>
                <p className={`text-xs mt-1.5 ${over ? 'text-rose-600 dark:text-rose-400' : near ? 'text-amber-600 dark:text-amber-400' : 'text-stone-500 dark:text-stone-400'}`}>
                  {over
                    ? `Passou ${formatBRL(b.spent - b.limit)} do teto.`
                    : `Sobram ${formatBRL(b.limit - b.spent)} este mês.`}
                </p>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="px-5 pb-5 text-xs text-stone-500 dark:text-stone-400">Defina tetos por categoria (ex: Alimentação R$800) e o app mostra uma barra de quanto você já comprometeu no mês.</p>
      )}
    </div>
  )

  const cartoesCard = (
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
  )

  const backupCard = (
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
  )

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 transition-colors">
      <div className="max-w-5xl mx-auto px-5 py-6 pb-28">

        {/* Header */}
        <header className="mb-6">
          <div className="flex items-start justify-between gap-4 mb-5">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-xs uppercase tracking-[0.2em] text-stone-500 dark:text-stone-400">Controle</p>
                {!isEmpty && (
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${health.cls}`}>
                    {health.label}
                  </span>
                )}
              </div>
              <h1 className="text-3xl sm:text-4xl font-light tracking-tight">
                Suas <em className="not-italic font-semibold">finanças</em> do mês
              </h1>
            </div>
            <div className="flex flex-col items-end gap-3 flex-shrink-0">
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
              <div className="flex items-center gap-1 bg-white dark:bg-stone-900 rounded-full p-1 border border-stone-200 dark:border-stone-800">
                <button onClick={() => changeMonth(-1)} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-stone-100 dark:hover:bg-stone-800 transition" aria-label="Mês anterior">
                  <ChevronLeft size={16} />
                </button>
                <p className="text-sm capitalize font-medium px-1.5 whitespace-nowrap">{monthLabel(currentMonth)}</p>
                <button onClick={() => changeMonth(1)} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-stone-100 dark:hover:bg-stone-800 transition" aria-label="Próximo mês">
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>

          {!isEmpty && (
            <div className="flex items-center gap-6 border-b border-stone-200 dark:border-stone-800">
              {[['panorama', 'Panorama'], ['ajustes', 'Ajustes']].map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={`pb-2.5 -mb-px text-sm border-b-2 transition ${tab === id ? 'border-emerald-600 dark:border-emerald-500 text-stone-900 dark:text-white font-medium' : 'border-transparent text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </header>

        {isEmpty ? (
          <EmptyState onAddIncome={() => setModal('income')} onAddExpense={() => setModal('expense')} />
        ) : tab === 'panorama' ? (
          <div className="grid lg:grid-cols-2 gap-x-3 items-start">
            <div>
              {saldoCard}
              {insightsCard}
              {entradasSaidasCard}
              {committedCard}
              {chartCard}
              {metaCard}
            </div>
            <div>
              {fixasCard}
              {movimentacoesCard}
            </div>
          </div>
        ) : (
          <div className="grid lg:grid-cols-2 gap-x-3 items-start">
            <div>
              {rendaCard}
              {reservaCard}
              {orcamentosCard}
            </div>
            <div>
              {cartoesCard}
              {backupCard}
            </div>
          </div>
        )}
      </div>

      {/* FAB — adicionar movimentação */}
      {!isEmpty && (
        <>
          {fabOpen && <div className="fixed inset-0 z-30" onClick={() => setFabOpen(false)} />}
          <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-2">
            {fabOpen && (
              <>
                <button onClick={() => { setModal('extra'); setFabOpen(false) }} className="flex items-center gap-2 pl-4 pr-5 py-3 rounded-full bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-sm font-medium shadow-lg shadow-emerald-700/20 transition animate-fade-in-up">
                  <TrendingUp size={16} /> Ganho extra
                </button>
                <button onClick={() => { setModal('expense'); setFabOpen(false) }} className="flex items-center gap-2 pl-4 pr-5 py-3 rounded-full bg-stone-900 dark:bg-white hover:bg-stone-700 dark:hover:bg-stone-200 text-white dark:text-stone-900 text-sm font-medium shadow-lg shadow-stone-900/20 dark:shadow-white/10 transition animate-fade-in-up">
                  <TrendingDown size={16} /> Despesa
                </button>
              </>
            )}
            <button onClick={() => setFabOpen((o) => !o)} className="w-14 h-14 rounded-full bg-stone-900 dark:bg-white text-white dark:text-stone-900 shadow-xl shadow-stone-900/30 dark:shadow-white/10 flex items-center justify-center hover:bg-stone-700 dark:hover:bg-stone-200 transition" aria-label="Adicionar">
              <Plus size={24} className={`transition-transform duration-200 ${fabOpen ? 'rotate-45' : ''}`} />
            </button>
          </div>
        </>
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
