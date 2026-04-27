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
    goals: parsed.goals || {},
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
