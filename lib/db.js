import { supabase } from './supabase'

// --- Row mappers (DB snake_case → JS camelCase) ---

function rowToExpense(row) {
  return {
    id: row.id,
    description: row.description,
    amount: Number(row.amount),
    category: row.category,
    date: row.date,
    ...(row.card_id ? { cardId: row.card_id } : {}),
    ...(row.custom_category_emoji ? { customCategoryEmoji: row.custom_category_emoji } : {}),
  }
}

function rowToExtra(row) {
  return {
    id: row.id,
    description: row.description,
    amount: Number(row.amount),
    date: row.date,
    ...(row.custom_category_emoji ? { customCategoryEmoji: row.custom_category_emoji } : {}),
  }
}

function rowToRecurring(row) {
  return {
    id: row.id,
    description: row.description,
    amount: Number(row.amount),
    category: row.category,
    ...(row.card_id ? { cardId: row.card_id } : {}),
    ...(row.custom_category_emoji ? { customCategoryEmoji: row.custom_category_emoji } : {}),
    ...(row.parcelado ? { parcelado: row.parcelado } : {}),
    ...(row.num_parcelas ? { numParcelas: row.num_parcelas } : {}),
    ...(row.start_month ? { startMonth: row.start_month } : {}),
    ...(row.due_day ? { dueDay: row.due_day } : {}),
  }
}

// --- Load ---

export async function loadAllData(userId) {
  const [
    { data: incomeRows, error: e1 },
    { data: expenseRows, error: e2 },
    { data: extraRows, error: e3 },
    { data: recurringRows, error: e4 },
    { data: disabledRows, error: e5 },
    { data: goalRows, error: e6 },
    { data: cardRows, error: e7 },
    { data: budgetRows, error: e8 },
    { data: reserveRows, error: e9 },
  ] = await Promise.all([
    supabase.from('income_history').select('*').eq('user_id', userId).order('start_month'),
    supabase.from('expenses').select('*').eq('user_id', userId),
    supabase.from('extras').select('*').eq('user_id', userId),
    supabase.from('recurring').select('*').eq('user_id', userId).order('created_at'),
    supabase.from('disabled_recurring').select('*').eq('user_id', userId),
    supabase.from('goals').select('*').eq('user_id', userId),
    supabase.from('user_cards').select('*').eq('user_id', userId),
    supabase.from('budgets').select('*').eq('user_id', userId),
    supabase.from('emergency_reserve').select('*').eq('user_id', userId),
  ])

  const error = e1 || e2 || e3 || e4 || e5 || e6 || e7 || e8 || e9
  if (error) return { error, data: null }

  const monthlyData = {}
  for (const row of expenseRows || []) {
    if (!monthlyData[row.month]) monthlyData[row.month] = { expenses: [], extras: [] }
    monthlyData[row.month].expenses.push(rowToExpense(row))
  }
  for (const row of extraRows || []) {
    if (!monthlyData[row.month]) monthlyData[row.month] = { expenses: [], extras: [] }
    monthlyData[row.month].extras.push(rowToExtra(row))
  }

  const disabledRecurring = {}
  for (const row of disabledRows || []) {
    if (!disabledRecurring[row.month]) disabledRecurring[row.month] = []
    disabledRecurring[row.month].push(row.recurring_id)
  }

  const goalRow = (goalRows || [])[0]
  const goal = goalRow
    ? { totalAmount: Number(goalRow.total_amount), startMonth: goalRow.start_month, months: goalRow.months }
    : null

  const budgets = {}
  for (const row of budgetRows || []) budgets[row.category] = Number(row.amount)

  const reserveRow = (reserveRows || [])[0]
  const reserve = reserveRow
    ? { currentAmount: Number(reserveRow.current_amount), targetMonths: reserveRow.target_months }
    : null

  return {
    error: null,
    data: {
      monthlyData,
      recurring: (recurringRows || []).map(rowToRecurring),
      goal,
      disabledRecurring,
      cards: (cardRows || []).map((r) => r.card_id),
      incomeHistory: (incomeRows || []).map((r) => ({ startMonth: r.start_month, amount: Number(r.amount) })),
      budgets,
      reserve,
    },
  }
}

// --- Income ---

export async function upsertIncome(userId, { startMonth, amount }) {
  return supabase
    .from('income_history')
    .upsert({ user_id: userId, start_month: startMonth, amount }, { onConflict: 'user_id,start_month' })
}

export async function deleteIncome(userId, startMonth) {
  return supabase.from('income_history').delete().eq('user_id', userId).eq('start_month', startMonth)
}

// --- Expenses ---

export async function insertExpense(userId, entry, month) {
  return supabase.from('expenses').insert({
    id: entry.id,
    user_id: userId,
    month,
    description: entry.description,
    amount: entry.amount,
    category: entry.category,
    date: entry.date,
    card_id: entry.cardId || null,
    custom_category_emoji: entry.customCategoryEmoji || null,
  })
}

export async function deleteExpense(userId, id) {
  return supabase.from('expenses').delete().eq('id', id).eq('user_id', userId)
}

export async function updateExpenseEntry(userId, id, updates) {
  return supabase.from('expenses').update({
    description: updates.description,
    amount: updates.amount,
    category: updates.category,
    date: updates.date,
    card_id: updates.cardId || null,
    custom_category_emoji: updates.customCategoryEmoji || null,
  }).eq('id', id).eq('user_id', userId)
}

// --- Extras ---

export async function insertExtra(userId, entry, month) {
  return supabase.from('extras').insert({
    id: entry.id,
    user_id: userId,
    month,
    description: entry.description,
    amount: entry.amount,
    date: entry.date,
    custom_category_emoji: entry.customCategoryEmoji || null,
  })
}

export async function deleteExtra(userId, id) {
  return supabase.from('extras').delete().eq('id', id).eq('user_id', userId)
}

export async function updateExtraEntry(userId, id, updates) {
  return supabase.from('extras').update({
    description: updates.description,
    amount: updates.amount,
    date: updates.date,
    custom_category_emoji: updates.customCategoryEmoji || null,
  }).eq('id', id).eq('user_id', userId)
}

// --- Recurring ---

export async function insertRecurring(userId, entry) {
  return supabase.from('recurring').insert({
    id: entry.id,
    user_id: userId,
    description: entry.description,
    amount: entry.amount,
    category: entry.category,
    card_id: entry.cardId || null,
    custom_category_emoji: entry.customCategoryEmoji || null,
    parcelado: entry.parcelado || false,
    num_parcelas: entry.numParcelas || null,
    start_month: entry.startMonth || null,
    due_day: entry.dueDay || null,
  })
}

export async function deleteRecurring(id) {
  return supabase.from('recurring').delete().eq('id', id)
}

export async function updateRecurringEntry(id, updates) {
  return supabase.from('recurring').update({
    description: updates.description,
    amount: updates.amount,
    category: updates.category,
    card_id: updates.cardId || null,
    custom_category_emoji: updates.customCategoryEmoji || null,
    parcelado: updates.parcelado || false,
    num_parcelas: updates.numParcelas || null,
    start_month: updates.startMonth || null,
    due_day: updates.dueDay || null,
  }).eq('id', id)
}

// --- Disabled recurring ---

export async function enableRecurring(userId, month, recurringId) {
  return supabase
    .from('disabled_recurring')
    .delete()
    .eq('user_id', userId)
    .eq('month', month)
    .eq('recurring_id', recurringId)
}

export async function disableRecurring(userId, month, recurringId) {
  return supabase.from('disabled_recurring').insert({ user_id: userId, month, recurring_id: recurringId })
}

// --- Goals ---

export async function upsertGoal(userId, { totalAmount, startMonth, months }) {
  return supabase
    .from('goals')
    .upsert(
      { user_id: userId, total_amount: totalAmount, start_month: startMonth, months },
      { onConflict: 'user_id' }
    )
}

export async function deleteGoal(userId) {
  return supabase.from('goals').delete().eq('user_id', userId)
}

// --- Budgets (teto por categoria) ---

export async function upsertBudget(userId, { category, amount }) {
  return supabase
    .from('budgets')
    .upsert({ user_id: userId, category, amount }, { onConflict: 'user_id,category' })
}

export async function deleteBudget(userId, category) {
  return supabase.from('budgets').delete().eq('user_id', userId).eq('category', category)
}

// --- Emergency reserve (reserva de emergência) ---

export async function upsertReserve(userId, { currentAmount, targetMonths }) {
  return supabase
    .from('emergency_reserve')
    .upsert(
      { user_id: userId, current_amount: currentAmount, target_months: targetMonths },
      { onConflict: 'user_id' }
    )
}

export async function deleteReserve(userId) {
  return supabase.from('emergency_reserve').delete().eq('user_id', userId)
}

// --- Cards ---

export async function insertCard(userId, cardId) {
  return supabase.from('user_cards').insert({ user_id: userId, card_id: cardId })
}

export async function deleteCard(userId, cardId) {
  return supabase.from('user_cards').delete().eq('user_id', userId).eq('card_id', cardId)
}

// --- Backup: replace all data ---

export async function replaceAllData(userId, data) {
  // disabled_recurring tem FK para recurring, então deleta primeiro
  await supabase.from('disabled_recurring').delete().eq('user_id', userId)
  await supabase.from('recurring').delete().eq('user_id', userId)
  await Promise.all([
    supabase.from('income_history').delete().eq('user_id', userId),
    supabase.from('expenses').delete().eq('user_id', userId),
    supabase.from('extras').delete().eq('user_id', userId),
    supabase.from('goals').delete().eq('user_id', userId),
    supabase.from('user_cards').delete().eq('user_id', userId),
    supabase.from('budgets').delete().eq('user_id', userId),
    supabase.from('emergency_reserve').delete().eq('user_id', userId),
  ])

  // Gera novos UUIDs para recurring e mantém mapeamento para disabled_recurring
  const idMap = {}
  const recurringRows = (data.recurring || []).map((r) => {
    const newId = crypto.randomUUID()
    idMap[String(r.id)] = newId
    return {
      id: newId,
      user_id: userId,
      description: r.description,
      amount: r.amount,
      category: r.category,
      card_id: r.cardId || null,
      custom_category_emoji: r.customCategoryEmoji || null,
      parcelado: r.parcelado || false,
      num_parcelas: r.numParcelas || null,
      start_month: r.startMonth || null,
      due_day: r.dueDay || null,
    }
  })

  // recurring deve ser inserido antes de disabled_recurring (FK constraint)
  if (recurringRows.length > 0) {
    await supabase.from('recurring').insert(recurringRows)
  }

  const inserts = []

  if ((data.incomeHistory || []).length > 0) {
    inserts.push(supabase.from('income_history').insert(
      data.incomeHistory.map((e) => ({ user_id: userId, start_month: e.startMonth, amount: e.amount }))
    ))
  }

  const allExpenses = []
  const allExtras = []
  for (const [month, monthData] of Object.entries(data.monthlyData || {})) {
    for (const e of monthData.expenses || []) {
      allExpenses.push({
        user_id: userId, month,
        description: e.description, amount: e.amount, category: e.category, date: e.date,
        card_id: e.cardId || null, custom_category_emoji: e.customCategoryEmoji || null,
      })
    }
    for (const e of monthData.extras || []) {
      allExtras.push({
        user_id: userId, month,
        description: e.description, amount: e.amount, date: e.date,
        custom_category_emoji: e.customCategoryEmoji || null,
      })
    }
  }
  if (allExpenses.length > 0) inserts.push(supabase.from('expenses').insert(allExpenses))
  if (allExtras.length > 0) inserts.push(supabase.from('extras').insert(allExtras))

  if (data.goal) {
    inserts.push(supabase.from('goals').insert({
      user_id: userId,
      total_amount: data.goal.totalAmount,
      start_month: data.goal.startMonth,
      months: data.goal.months,
    }))
  }

  if ((data.cards || []).length > 0) {
    inserts.push(supabase.from('user_cards').insert(data.cards.map((cardId) => ({ user_id: userId, card_id: cardId }))))
  }

  const budgetEntries = Object.entries(data.budgets || {})
  if (budgetEntries.length > 0) {
    inserts.push(supabase.from('budgets').insert(
      budgetEntries.map(([category, amount]) => ({ user_id: userId, category, amount }))
    ))
  }

  if (data.reserve) {
    inserts.push(supabase.from('emergency_reserve').insert({
      user_id: userId,
      current_amount: data.reserve.currentAmount,
      target_months: data.reserve.targetMonths,
    }))
  }

  const disabledEntries = []
  for (const [month, ids] of Object.entries(data.disabledRecurring || {})) {
    for (const oldId of ids) {
      const newId = idMap[String(oldId)]
      if (newId) disabledEntries.push({ user_id: userId, month, recurring_id: newId })
    }
  }
  if (disabledEntries.length > 0) inserts.push(supabase.from('disabled_recurring').insert(disabledEntries))

  const results = await Promise.all(inserts)
  const error = results.find((r) => r.error)?.error || null
  return { error }
}
