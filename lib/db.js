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
    category: row.category,
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
  ] = await Promise.all([
    supabase.from('income_history').select('*').eq('user_id', userId).order('start_month'),
    supabase.from('expenses').select('*').eq('user_id', userId),
    supabase.from('extras').select('*').eq('user_id', userId),
    supabase.from('recurring').select('*').eq('user_id', userId).order('created_at'),
    supabase.from('disabled_recurring').select('*').eq('user_id', userId),
    supabase.from('goals').select('*').eq('user_id', userId),
    supabase.from('user_cards').select('*').eq('user_id', userId),
  ])

  const error = e1 || e2 || e3 || e4 || e5 || e6 || e7
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

  const goals = {}
  for (const row of goalRows || []) {
    goals[row.month] = Number(row.amount)
  }

  return {
    error: null,
    data: {
      monthlyData,
      recurring: (recurringRows || []).map(rowToRecurring),
      goals,
      disabledRecurring,
      cards: (cardRows || []).map((r) => r.card_id),
      incomeHistory: (incomeRows || []).map((r) => ({ startMonth: r.start_month, amount: Number(r.amount) })),
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

// --- Extras ---

export async function insertExtra(userId, entry, month) {
  return supabase.from('extras').insert({
    id: entry.id,
    user_id: userId,
    month,
    description: entry.description,
    amount: entry.amount,
    category: entry.category,
    date: entry.date,
    custom_category_emoji: entry.customCategoryEmoji || null,
  })
}

export async function deleteExtra(userId, id) {
  return supabase.from('extras').delete().eq('id', id).eq('user_id', userId)
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

export async function upsertGoal(userId, month, amount) {
  return supabase
    .from('goals')
    .upsert({ user_id: userId, month, amount }, { onConflict: 'user_id,month' })
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
        description: e.description, amount: e.amount, category: e.category, date: e.date,
        custom_category_emoji: e.customCategoryEmoji || null,
      })
    }
  }
  if (allExpenses.length > 0) inserts.push(supabase.from('expenses').insert(allExpenses))
  if (allExtras.length > 0) inserts.push(supabase.from('extras').insert(allExtras))

  const goalEntries = Object.entries(data.goals || {}).map(([month, amount]) => ({ user_id: userId, month, amount }))
  if (goalEntries.length > 0) inserts.push(supabase.from('goals').insert(goalEntries))

  if ((data.cards || []).length > 0) {
    inserts.push(supabase.from('user_cards').insert(data.cards.map((cardId) => ({ user_id: userId, card_id: cardId }))))
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
