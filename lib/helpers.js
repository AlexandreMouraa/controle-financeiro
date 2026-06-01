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
    budgets: parsed.budgets || {},
    reserve: parsed.reserve || null,
  }
}

// Gasto do mês por categoria (variáveis + fixas ativas), no formato { cat: total }.
export const spendByCategory = (data, key) => {
  const md = data.monthlyData[key] || { expenses: [], extras: [] }
  const disabledIds = data.disabledRecurring[key] || []
  const activeRecurring = data.recurring.filter((r) => !disabledIds.includes(r.id))
  const out = {}
  for (const e of [...md.expenses, ...activeRecurring]) {
    out[e.category] = (out[e.category] || 0) + e.amount
  }
  return out
}

// Progresso da reserva de emergência. Meta = targetMonths × despesa fixa do mês.
export const computeReserveProgress = (data, key) => {
  const r = data.reserve
  if (!r) return null
  const summary = computeMonthSummary(data, key)
  const monthlyNeed = summary.recurringTotal
  const target = monthlyNeed * r.targetMonths
  const current = r.currentAmount
  const progress = target > 0 ? Math.min(current / target, 1) : (current > 0 ? 1 : 0)
  const monthsCovered = monthlyNeed > 0 ? current / monthlyNeed : 0
  return {
    currentAmount: current,
    targetMonths: r.targetMonths,
    monthlyNeed,
    target,
    progress,
    monthsCovered,
    remaining: Math.max(target - current, 0),
    done: target > 0 && current >= target,
  }
}

// Frases curtas de insight sobre o mês visualizado. Retorna no máx. `limit`.
// tone: 'good' | 'warn' | 'bad' | 'info'. Usado no topo do dashboard.
export const computeInsights = (data, key, limit = 3) => {
  const insights = []
  const cur = computeMonthSummary(data, key)
  const prevKey = shiftMonth(key, -1)
  const prev = computeMonthSummary(data, prevKey)
  const prevMonthName = monthLabel(prevKey).split(' de ')[0]
  const hasPrev = prev.totalIncome > 0 || prev.totalExpenses > 0

  // 1. Vermelho neste mês (e há quanto tempo)
  if (cur.balance < 0) {
    const prev2 = computeMonthSummary(data, shiftMonth(key, -2))
    const twoInRow = prev.balance < 0 && (prev.totalIncome > 0 || prev.totalExpenses > 0)
    const threeInRow = twoInRow && prev2.balance < 0
    insights.push({
      id: 'red',
      tone: 'bad',
      text: threeInRow
        ? 'Você fechou no vermelho 3 meses seguidos. Hora de cortar gastos ou rever a renda.'
        : twoInRow
        ? 'Segundo mês seguido no vermelho. Vale revisar onde dá pra economizar.'
        : `Você gastou ${formatBRL(Math.abs(cur.balance))} a mais do que ganhou este mês.`,
    })
  }

  // 2. Categorias acima do orçamento
  const budgets = data.budgets || {}
  const spend = spendByCategory(data, key)
  const overBudget = Object.entries(budgets)
    .filter(([cat, limitVal]) => limitVal > 0 && (spend[cat] || 0) > limitVal)
    .map(([cat, limitVal]) => ({ cat, over: (spend[cat] || 0) - limitVal }))
    .sort((a, b) => b.over - a.over)
  if (overBudget.length > 0) {
    const top = overBudget[0]
    const catLabel = findCategory(top.cat)?.label || 'categoria'
    insights.push({
      id: 'budget',
      tone: 'warn',
      text: overBudget.length === 1
        ? `${catLabel} passou do orçamento em ${formatBRL(top.over)}.`
        : `${overBudget.length} categorias passaram do orçamento — ${catLabel} é a maior (${formatBRL(top.over)} acima).`,
    })
  }

  // 3. Maior salto de gasto por categoria vs mês anterior
  if (hasPrev) {
    const prevSpend = spendByCategory(data, prevKey)
    let biggest = null
    for (const [cat, val] of Object.entries(spend)) {
      const before = prevSpend[cat] || 0
      if (before > 0 && val > before * 1.3 && val - before >= 50) {
        const jump = (val - before) / before
        if (!biggest || jump > biggest.jump) biggest = { cat, jump, val, before }
      }
    }
    if (biggest) {
      const catLabel = findCategory(biggest.cat)?.label || 'uma categoria'
      insights.push({
        id: 'jump',
        tone: 'warn',
        text: `${catLabel} subiu ${Math.round(biggest.jump * 100)}% vs ${prevMonthName} (${formatBRL(biggest.before)} → ${formatBRL(biggest.val)}).`,
      })
    }
  }

  // 4. Sobrou bem — sugere guardar
  if (cur.balance > 0 && cur.totalIncome > 0) {
    const pct = cur.balance / cur.totalIncome
    if (pct >= 0.2) {
      insights.push({
        id: 'surplus',
        tone: 'good',
        text: `Sobrou ${formatBRL(cur.balance)} (${Math.round(pct * 100)}% da renda) este mês. Que tal guardar na reserva?`,
      })
    }
  }

  return insights.slice(0, limit)
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
