'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Plus, TrendingUp, TrendingDown, ChevronLeft, ChevronRight, Menu,
  Sun, Moon, LogOut, LayoutDashboard, ArrowLeftRight, CreditCard,
  Target, CalendarDays, BarChart3, Wallet, Settings, Repeat, KeyRound, ChevronUp,
} from 'lucide-react'

import { supabase } from '@/lib/supabase'
import * as db from '@/lib/db'
import { CATEGORIES, THEME_KEY } from '@/lib/constants'
import {
  monthKey, monthLabel, emptyMonth, shiftMonth, computeMonthSummary,
  findCategory, findCard, migrateData, computeGoalProgress, computeInsights,
  computeReserveProgress, computeHistory, deriveDebts, derivePlanning,
} from '@/lib/helpers'

import Modal from './Modal'
import CardsModal from './CardsModal'
import IncomeHistoryModal from './IncomeHistoryModal'
import ToastContainer from './Toast'
import ConfirmDialog from './ConfirmDialog'
import DashboardSkeleton from './DashboardSkeleton'
import EmptyState from './EmptyState'

import DashboardModule from './modules/DashboardModule'
import TransacoesModule from './modules/TransacoesModule'
import { DividasModule, MetasModule } from './modules/DividasMetasModule'
import { PlanejamentoModule, RelatoriosModule } from './modules/PlanejamentoRelatoriosModule'
import { CategoriasModule, ConfiguracoesModule } from './modules/CategoriasConfigModule'
import FixasModule from './modules/FixasModule'

const NAV = [
  { id: 'dashboard', label: 'Dashboard', Icon: LayoutDashboard, title: 'Dashboard', crumb: 'Resumo executivo do mês' },
  { id: 'transacoes', label: 'Transações', Icon: ArrowLeftRight, title: 'Transações', crumb: 'Todas as movimentações' },
  { id: 'fixas', label: 'Despesas fixas', Icon: Repeat, title: 'Despesas fixas', crumb: 'Contas recorrentes do mês' },
  { id: 'dividas', label: 'Dívidas', Icon: CreditCard, title: 'Dívidas', crumb: 'Parcelamentos e quitação' },
  { id: 'metas', label: 'Metas', Icon: Target, title: 'Metas financeiras', crumb: 'Objetivos e poupança' },
  { id: 'planejamento', label: 'Planejamento', Icon: CalendarDays, title: 'Planejamento', crumb: 'Calendário e fluxo futuro' },
  { id: 'relatorios', label: 'Relatórios', Icon: BarChart3, title: 'Relatórios', crumb: 'Análises financeiras' },
  { id: 'categorias', label: 'Orçamentos', Icon: Wallet, title: 'Orçamentos', crumb: 'Tetos de gasto por categoria' },
  { id: 'configuracoes', label: 'Configurações', Icon: Settings, title: 'Configurações', crumb: 'Preferências e dados' },
]

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
  const [page, setPage] = useState('dashboard')
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [fabOpen, setFabOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [pwdForm, setPwdForm] = useState(null) // { p1, p2, saving } quando trocando senha
  const [userEmail, setUserEmail] = useState('')
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
      setUserEmail(user.email || '')
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

  // fecha o drawer mobile ao trocar de página
  useEffect(() => { setMobileOpen(false) }, [page])

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

  // Troca a senha do usuário logado. Retorna true em caso de sucesso.
  const changePassword = async (password) => {
    if (!password || password.length < 6) {
      addToast('A senha precisa ter ao menos 6 caracteres.')
      return false
    }
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      console.error('Erro ao trocar senha:', error)
      addToast('Não foi possível trocar a senha. Tente novamente.')
      return false
    }
    addToast('Senha alterada com sucesso.', 'success')
    return true
  }

  // Submete o form de troca de senha do popover de perfil.
  const submitPassword = async () => {
    if (!pwdForm || pwdForm.saving) return
    if (pwdForm.p1 !== pwdForm.p2) { addToast('As senhas não conferem.'); return }
    setPwdForm((f) => ({ ...f, saving: true }))
    const ok = await changePassword(pwdForm.p1)
    if (ok) { setPwdForm(null); setProfileOpen(false) }
    else setPwdForm((f) => (f ? { ...f, saving: false } : f))
  }

  const monthData = data.monthlyData[currentMonth] || emptyMonth()
  const disabledIds = data.disabledRecurring[currentMonth] || []
  const activeRecurring = data.recurring.filter((r) => !disabledIds.includes(r.id))
  const {
    recurringTotal, mainIncome, totalExtras, totalIncome,
    variableExpensesTotal, totalExpenses, balance,
  } = computeMonthSummary(data, currentMonth)
  const summary = { recurringTotal, mainIncome, totalExtras, totalIncome, variableExpensesTotal, totalExpenses, balance }
  const prevSummary = computeMonthSummary(data, shiftMonth(currentMonth, -1))
  const goalInfo = computeGoalProgress(data, currentMonth)
  const reserveInfo = computeReserveProgress(data, currentMonth)
  const insights = computeInsights(data, currentMonth)
  const userCards = data.cards.map((id) => findCard(id)).filter(Boolean)
  const history = computeHistory(data, currentMonth, 6)
  const debts = deriveDebts(data, currentMonth)
  const planning = derivePlanning(data, currentMonth)

  const hasAnyData =
    data.incomeHistory.length > 0 ||
    data.recurring.length > 0 ||
    data.cards.length > 0 ||
    data.goal != null ||
    data.reserve != null ||
    Object.keys(data.budgets).length > 0 ||
    Object.values(data.monthlyData).some((m) => m.expenses.length > 0 || m.extras.length > 0)
  const isEmpty = loaded && hasAnyData === false

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

  const allTransactions = [
    ...monthData.extras.map((e) => ({ ...e, type: 'extra' })),
    ...monthData.expenses.map((e) => ({ ...e, type: 'expense' })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date))

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

  // Remove uma transação de qualquer mês (usado na tabela de Transações).
  const removeTransaction = async (t) => {
    const month = t.date.slice(0, 7)
    const key = t.type === 'extra' ? 'extras' : 'expenses'
    const prevMonth = data.monthlyData[month]
    setData((d) => {
      const md = d.monthlyData[month] || emptyMonth()
      return { ...d, monthlyData: { ...d.monthlyData, [month]: { ...md, [key]: md[key].filter((x) => x.id !== t.id) } } }
    })
    const { error } = t.type === 'extra'
      ? await db.deleteExtra(userIdRef.current, t.id)
      : await db.deleteExpense(userIdRef.current, t.id)
    if (error) {
      console.error('Erro ao remover transação:', error)
      setData((d) => ({ ...d, monthlyData: { ...d.monthlyData, [month]: prevMonth } }))
      addToast('Erro ao remover transação.')
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

  const dividasAbertas = debts.filter((d) => !d.quitada).length
  const nav = NAV.find((n) => n.id === page) || NAV[0]
  const userName = userEmail ? userEmail.split('@')[0] : 'Você'
  const initials = (userEmail || 'VC').slice(0, 2).toUpperCase()

  // contexto compartilhado pelos módulos
  const ctx = {
    data, currentMonth, summary, prevSummary, history, debts, planning,
    chartData, insights, goalInfo, reserveInfo, budgetList, userCards,
    expensesByCategory, recurringTotal, allTransactions,
    activeRecurring, disabledIds,
    isCurrentRealMonth, todayDay, theme,
    userEmail, handleLogout, loggingOut, changePassword, addToast,
    go: setPage, openModal: setModal, toggleTheme, askConfirm,
    removeTransaction, removeGoal, removeReserve, removeBudget, setEditingBudget,
    setEditingRecurring, toggleRecurringForMonth, removeRecurring,
    exportBackup, fileInputRef,
  }

  const renderPage = () => {
    // estado vazio: só Configurações fica acessível (restaurar backup, tema, cartões)
    if (isEmpty && page !== 'configuracoes') {
      return <EmptyState onAddIncome={() => setModal('income')} onAddExpense={() => setModal('expense')} onRestore={() => fileInputRef.current?.click()} />
    }
    switch (page) {
      case 'transacoes': return <TransacoesModule ctx={ctx} />
      case 'fixas': return <FixasModule ctx={ctx} />
      case 'dividas': return <DividasModule ctx={ctx} />
      case 'metas': return <MetasModule ctx={ctx} />
      case 'planejamento': return <PlanejamentoModule ctx={ctx} />
      case 'relatorios': return <RelatoriosModule ctx={ctx} />
      case 'categorias': return <CategoriasModule ctx={ctx} />
      case 'configuracoes': return <ConfiguracoesModule ctx={ctx} />
      default: return <DashboardModule ctx={ctx} />
    }
  }

  const showMonthNav = !isEmpty && page !== 'configuracoes' && page !== 'transacoes'

  return (
    <div className={'app' + (collapsed ? ' collapsed' : '') + (mobileOpen ? ' mobile-open' : '')}>
      <div className="scrim" onClick={() => setMobileOpen(false)} />

      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="sb-brand">
          <span className="mark">F</span>
          <span className="nm">FinTrack</span>
        </div>
        <nav className="sb-nav">
          {NAV.slice(0, 7).map((n) => (
            <button key={n.id} className={'nav-item' + (page === n.id ? ' active' : '')} onClick={() => setPage(n.id)} title={n.label}>
              <span className="ic"><n.Icon size={19} /></span>
              <span className="lbl">{n.label}</span>
              {n.id === 'dividas' && dividasAbertas > 0 && <span className="nav-badge">{dividasAbertas}</span>}
            </button>
          ))}
          <div className="sb-section">Configuração</div>
          {NAV.slice(7).map((n) => (
            <button key={n.id} className={'nav-item' + (page === n.id ? ' active' : '')} onClick={() => setPage(n.id)} title={n.label}>
              <span className="ic"><n.Icon size={19} /></span>
              <span className="lbl">{n.label}</span>
            </button>
          ))}
        </nav>
        <div className="sb-foot">
          {profileOpen && <div className="menu-scrim" onClick={() => { setProfileOpen(false); setPwdForm(null) }} />}
          <button className={'sb-user' + (profileOpen ? ' open' : '')} onClick={() => setProfileOpen((o) => !o)} title="Conta">
            <span className="av">{initials}</span>
            <div className="meta">
              <div className="n">{userName}</div>
              <div className="e">{userEmail}</div>
            </div>
            <ChevronUp className="chev" size={16} />
          </button>

          {profileOpen && (
            <div className="profile-menu">
              <div className="pm-head">
                <span className="av">{initials}</span>
                <div className="meta"><div className="n">{userName}</div><div className="e">{userEmail}</div></div>
              </div>
              {pwdForm ? (
                <div className="pwd-form">
                  <input className="input" type="password" placeholder="Nova senha (mín. 6)" value={pwdForm.p1} autoFocus
                    onChange={(e) => setPwdForm((f) => ({ ...f, p1: e.target.value }))} autoComplete="new-password" />
                  <input className="input" type="password" placeholder="Confirmar senha" value={pwdForm.p2}
                    onChange={(e) => setPwdForm((f) => ({ ...f, p2: e.target.value }))} autoComplete="new-password"
                    onKeyDown={(e) => { if (e.key === 'Enter') submitPassword() }} />
                  <div className="backup-btns">
                    <button className="btn-ghost sm" onClick={submitPassword} disabled={pwdForm.saving || !pwdForm.p1 || !pwdForm.p2}>{pwdForm.saving ? 'Salvando…' : 'Salvar'}</button>
                    <button className="btn-ghost sm" onClick={() => setPwdForm(null)}>Cancelar</button>
                  </div>
                </div>
              ) : (
                <>
                  <button onClick={() => setPwdForm({ p1: '', p2: '', saving: false })}><KeyRound size={16} /> Trocar senha</button>
                  <button className="danger" onClick={handleLogout} disabled={loggingOut}><LogOut size={16} /> {loggingOut ? 'Saindo…' : 'Sair'}</button>
                </>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* MAIN */}
      <div className="main">
        <header className="topbar">
          <button className="icon-btn" onClick={() => { if (window.innerWidth <= 860) setMobileOpen((o) => !o); else setCollapsed((c) => !c) }} title="Menu" aria-label="Menu"><Menu size={18} /></button>
          <div className="tb-title">
            <h1>{nav.title}</h1>
            <div className="crumb">{nav.crumb}</div>
          </div>
          <div className="tb-spacer" />
          {showMonthNav && (
            <div className="tb-month">
              <button className="arrow" onClick={() => changeMonth(-1)} aria-label="Mês anterior"><ChevronLeft size={16} /></button>
              <span className="lbl">{monthLabel(currentMonth)}</span>
              <button className="arrow" onClick={() => changeMonth(1)} aria-label="Próximo mês"><ChevronRight size={16} /></button>
            </div>
          )}
          {!isEmpty && (
            <div className="tb-new">
              <button className="btn-solid" onClick={() => setFabOpen((o) => !o)} aria-expanded={fabOpen}><Plus size={15} /> Novo</button>
              {fabOpen && (
                <>
                  <div className="menu-scrim" onClick={() => setFabOpen(false)} />
                  <div className="tb-menu">
                    <button onClick={() => { setModal('extra'); setFabOpen(false) }}><TrendingUp size={16} /> Ganho extra</button>
                    <button onClick={() => { setModal('expense'); setFabOpen(false) }}><TrendingDown size={16} /> Despesa</button>
                    <button onClick={() => { setModal('recurring'); setFabOpen(false) }}><Repeat size={16} /> Despesa fixa</button>
                  </div>
                </>
              )}
            </div>
          )}
          <button className="icon-btn" title="Tema" onClick={toggleTheme} aria-label="Alternar tema">{theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}</button>
        </header>

        <main className="content" key={page}>
          {renderPage()}
        </main>
      </div>

      {/* FAB */}
      {!isEmpty && (
        <div className="fab-zone">
          {fabOpen && (
            <div className="fab-menu">
              <button className="fab-action in" onClick={() => { setModal('extra'); setFabOpen(false) }}><TrendingUp size={17} /> Ganho extra</button>
              <button className="fab-action out" style={{ animationDelay: '.05s' }} onClick={() => { setModal('expense'); setFabOpen(false) }}><TrendingDown size={17} /> Despesa</button>
              <button className="fab-action out" style={{ animationDelay: '.1s' }} onClick={() => { setModal('recurring'); setFabOpen(false) }}><Repeat size={17} /> Despesa fixa</button>
            </div>
          )}
          <button className={'fab' + (fabOpen ? ' open' : '')} onClick={() => setFabOpen((o) => !o)} title="Adicionar" aria-label="Adicionar"><Plus size={26} strokeWidth={2.2} /></button>
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

      {/* input de restore fica no root para funcionar também no estado vazio */}
      <input type="file" accept=".json" ref={fileInputRef} onChange={importBackup} style={{ display: 'none' }} />

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      <ConfirmDialog state={confirmState} onConfirm={() => resolveConfirm(true)} onCancel={() => resolveConfirm(false)} />
    </div>
  )
}
