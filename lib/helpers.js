import { CATEGORIES, DEFAULT_CARDS } from './constants'

export const formatBRL = (n) =>
  (n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export const monthKey = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`

export const monthLabel = (key) => {
  const [y, m] = key.split('-')
  const d = new Date(parseInt(y), parseInt(m) - 1, 1)
  return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
}

export const emptyMonth = () => ({ extras: [], expenses: [] })

export const shiftMonth = (key, delta) => {
  const [y, m] = key.split('-').map(Number)
  return monthKey(new Date(y, m - 1 + delta, 1))
}

// Resumo financeiro de um mês qualquer — mesma lógica usada no dashboard,
// extraída para reuso (mês anterior, sparkline, etc).
export const computeMonthSummary = (data, key) => {
  const md = data.monthlyData[key] || { extras: [], expenses: [] }
  const disabledIds = data.disabledRecurring[key] || []
  const activeRecurring = data.recurring.filter((r) => !disabledIds.includes(r.id))
  const recurringTotal = activeRecurring.reduce((s, e) => s + e.amount, 0)
  const mainIncome = getApplicableIncome(data.incomeHistory, key)
  const totalExtras = md.extras.reduce((s, e) => s + e.amount, 0)
  const totalIncome = mainIncome + totalExtras
  const variableExpensesTotal = md.expenses.reduce((s, e) => s + e.amount, 0)
  const totalExpenses = variableExpensesTotal + recurringTotal
  return {
    mainIncome, totalExtras, totalIncome,
    recurringTotal, variableExpensesTotal, totalExpenses,
    balance: totalIncome - totalExpenses,
  }
}
// Progresso de uma meta "valor total em X meses".
// Acumula o que sobrou (saldo positivo) de cada mês, do mês inicial até o
// mês visualizado (limitado ao fim do período). Retorna null se não há meta.
export const computeGoalProgress = (data, viewedMonth) => {
  const g = data.goal
  if (!g) return null
  const { totalAmount, startMonth, months } = g
  const endMonth = shiftMonth(startMonth, months - 1)

  let saved = 0
  if (viewedMonth >= startMonth) {
    const upTo = viewedMonth < endMonth ? viewedMonth : endMonth
    for (let m = startMonth; m <= upTo; m = shiftMonth(m, 1)) {
      saved += Math.max(computeMonthSummary(data, m).balance, 0)
    }
  }

  // Meses que ainda faltam (a partir do mês seguinte ao visualizado, ou do
  // início se a meta ainda não começou), até o fim do período.
  const fromMonth = viewedMonth >= startMonth ? shiftMonth(viewedMonth, 1) : startMonth
  let monthsRemaining = 0
  for (let m = fromMonth; m <= endMonth; m = shiftMonth(m, 1)) monthsRemaining++

  const progress = totalAmount > 0 ? Math.min(saved / totalAmount, 1) : 0
  const remainingAmount = Math.max(totalAmount - saved, 0)
  const requiredRate = monthsRemaining > 0 ? remainingAmount / monthsRemaining : 0

  return {
    totalAmount, startMonth, endMonth, months,
    saved, progress, remainingAmount, monthsRemaining, requiredRate,
    done: saved >= totalAmount && totalAmount > 0,
    isActive: viewedMonth >= startMonth && viewedMonth <= endMonth,
    notStarted: viewedMonth < startMonth,
    ended: viewedMonth > endMonth,
  }
}

export const findCategory = (id) => CATEGORIES.find((c) => c.id === id)
export const findCard = (id) => DEFAULT_CARDS.find((c) => c.id === id)

export const getApplicableIncome = (incomeHistory, month) => {
  if (!incomeHistory || incomeHistory.length === 0) return 0
  const applicable = incomeHistory
    .filter((e) => e.startMonth <= month)
    .sort((a, b) => b.startMonth.localeCompare(a.startMonth))[0]
  return applicable?.amount || 0
}

export const migrateData = (parsed) => {
  let incomeHistory = parsed.incomeHistory
  let monthlyData = parsed.monthlyData || {}

  if (!incomeHistory) {
    incomeHistory = []
    const months = Object.keys(monthlyData).sort()
    let lastAmount = -1
    for (const m of months) {
      const amt = monthlyData[m].mainIncome || 0
      if (amt > 0 && amt !== lastAmount) {
        incomeHistory.push({ startMonth: m, amount: amt })
        lastAmount = amt
      }
    }
    monthlyData = Object.fromEntries(
      Object.entries(monthlyData).map(([m, d]) => {
        const { mainIncome: _legacy, ...rest } = d
        return [m, rest]
      })
    )
  }

  return {
    monthlyData,
    recurring: parsed.recurring || [],
    // Modelo novo: meta única { totalAmount, startMonth, months }.
    // Backups antigos guardavam goals como { 'YYYY-MM': amount } — esse
    // formato não é convertido (a meta é redefinida após restaurar).
    goal: parsed.goal || null,
    disabledRecurring: parsed.disabledRecurring || {},
    cards: parsed.cards || [],
    incomeHistory,
  }
}

export const getInstallmentInfo = (item, viewedMonth) => {
  if (!item.parcelado || !item.numParcelas) return null
  let sy, sm
  if (item.startMonth) {
    ;[sy, sm] = item.startMonth.split('-').map(Number)
  } else if (item.date) {
    const d = new Date(item.date + 'T12:00:00')
    sy = d.getFullYear()
    sm = d.getMonth() + 1
  } else {
    return null
  }
  const [vy, vm] = viewedMonth.split('-').map(Number)
  const monthsElapsed = (vy - sy) * 12 + (vm - sm)
  const currentInstallment = Math.min(monthsElapsed + 1, item.numParcelas)
  const remaining = item.numParcelas - currentInstallment
  return { total: item.numParcelas, currentInstallment, remaining }
}
