'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { CATEGORIES, CUSTOM_EMOJIS } from '@/lib/constants'
import BankLogo from './BankLogo'

export default function Modal({
  type,
  onClose,
  onSubmit,
  currentIncome,
  currentGoal,
  userCards = [],
  initialValues = null,
  currentViewedMonth = '',
}) {
  const [amount, setAmount] = useState(() => {
    if (initialValues) return String(initialValues.amount)
    if (type === 'income' && currentIncome) return String(currentIncome)
    if (type === 'goal' && currentGoal) return String(currentGoal)
    return ''
  })
  const [description, setDescription] = useState(() => initialValues?.description || '')
  const [category, setCategory] = useState(() => initialValues?.category || 'alimentacao')
  const [date, setDate] = useState(() => initialValues?.date || new Date().toISOString().split('T')[0])
  const [cardId, setCardId] = useState(() => initialValues?.cardId || null)
  const [parceladoId, setParceladoId] = useState(() => initialValues?.parcelado ? 'parcelado' : null)
  const [numParcelas, setNumParcelas] = useState(() => initialValues?.numParcelas || 2)
  const [customEmoji, setCustomEmoji] = useState(() => initialValues?.customCategoryEmoji || '')
  const [startMonth, setStartMonth] = useState(() => initialValues?.startMonth || currentViewedMonth)
  const [incomeStartMonth, setIncomeStartMonth] = useState(() =>
    type === 'income' && initialValues?.startMonth ? initialValues.startMonth : currentViewedMonth
  )

  const titles = {
    income: initialValues ? 'Editar renda' : 'Renda principal',
    extra: 'Ganho extra',
    expense: 'Nova despesa',
    goal: 'Meta de poupança',
    recurring: initialValues ? 'Editar despesa fixa' : 'Despesa fixa',
  }
  const subtitles = {
    income: 'Vale para esse mês e os seguintes, até a próxima alteração',
    extra: 'Alguém te pagou? Bico? Coloca aqui.',
    expense: 'Tudo o que saiu da conta',
    goal: 'Quanto você quer guardar este mês',
    recurring: 'Conta automaticamente todo mês',
  }

  const handleSubmit = () => {
    const num = parseFloat(String(amount).replace(',', '.'))
    if (isNaN(num) || num <= 0) return
    if (type === 'income') {
      onSubmit({ amount: num, startMonth: incomeStartMonth })
    } else if (type === 'goal') {
      onSubmit({ amount: num })
    } else if (type === 'extra') {
      if (!description.trim()) return
      onSubmit({ amount: num, description: description.trim(), date })
    } else if (type === 'expense') {
      if (!description.trim()) return
      const payload = { amount: num, description: description.trim(), category, date, cardId }
      if (category === 'outros' && customEmoji) payload.customCategoryEmoji = customEmoji
      onSubmit(payload)
    } else if (type === 'recurring') {
      if (!description.trim()) return
      const rPayload = { amount: num, description: description.trim(), category }
      if (category === 'outros' && customEmoji) rPayload.customCategoryEmoji = customEmoji
      if (parceladoId === 'parcelado') {
        const [sy, sm] = startMonth.split('-').map(Number)
        const [vy, vm] = currentViewedMonth.split('-').map(Number)
        const elapsed = (vy - sy) * 12 + (vm - sm)
        if (elapsed < 0) return
        rPayload.parcelado = true
        rPayload.numParcelas = numParcelas
        rPayload.startMonth = startMonth
      } else {
        rPayload.cardId = cardId
      }
      onSubmit(rPayload)
    }
  }

  const showDescription = type !== 'income' && type !== 'goal'
  const showDate = type === 'extra' || type === 'expense'
  const showCategory = type === 'expense' || type === 'recurring'
  const showCard = type === 'expense' || type === 'recurring'

  return (
    <div
      className="fixed inset-0 bg-stone-900/40 dark:bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-stone-50 dark:bg-stone-950 rounded-t-3xl sm:rounded-3xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto border border-transparent dark:border-stone-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-5">
          <div>
            <h3 className="text-2xl font-medium tracking-tight text-stone-900 dark:text-stone-100">
              {titles[type]}
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">{subtitles[type]}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-stone-200 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 flex items-center justify-center flex-shrink-0"
            aria-label="Fechar"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-[10px] uppercase tracking-[0.15em] text-stone-500 dark:text-stone-400 block mb-2">Valor</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-500 dark:text-stone-400 text-sm">R$</span>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0,00"
                autoFocus
                className="w-full pl-11 pr-4 py-3 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl text-lg text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-600 focus:outline-none focus:border-stone-900 dark:focus:border-stone-300 transition"
              />
            </div>
          </div>

          {type === 'income' && (
            <div>
              <label className="text-[10px] uppercase tracking-[0.15em] text-stone-500 dark:text-stone-400 block mb-2">A partir de</label>
              <input
                type="month"
                value={incomeStartMonth}
                onChange={(e) => setIncomeStartMonth(e.target.value)}
                className="w-full px-4 py-3 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl text-stone-900 dark:text-stone-100 focus:outline-none focus:border-stone-900 dark:focus:border-stone-300 transition"
              />
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-2">
                Esse valor vale a partir desse mês e segue nos próximos, até você registrar outra alteração.
              </p>
            </div>
          )}

          {showDescription && (
            <div>
              <label className="text-[10px] uppercase tracking-[0.15em] text-stone-500 dark:text-stone-400 block mb-2">Descrição</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={type === 'extra' ? 'Ex: Pagamento do João' : type === 'recurring' ? 'Ex: Aluguel, Netflix, Internet' : 'Ex: Mercado'}
                className="w-full px-4 py-3 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-600 focus:outline-none focus:border-stone-900 dark:focus:border-stone-300 transition"
              />
            </div>
          )}

          {showDate && (
            <div>
              <label className="text-[10px] uppercase tracking-[0.15em] text-stone-500 dark:text-stone-400 block mb-2">Data</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-3 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl text-stone-900 dark:text-stone-100 focus:outline-none focus:border-stone-900 dark:focus:border-stone-300 transition"
              />
            </div>
          )}

          {showCategory && (
            <div>
              <label className="text-[10px] uppercase tracking-[0.15em] text-stone-500 dark:text-stone-400 block mb-2">Categoria</label>
              <div className="grid grid-cols-2 gap-2">
                {CATEGORIES.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => { setCategory(c.id); if (c.id !== 'outros') setCustomEmoji('') }}
                    className={`px-3 py-2.5 rounded-xl text-sm flex items-center gap-2 transition ${
                      category === c.id
                        ? 'bg-stone-900 dark:bg-white text-white dark:text-stone-900'
                        : 'bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 hover:border-stone-400 dark:hover:border-stone-600 text-stone-900 dark:text-stone-100'
                    }`}
                  >
                    <span>{c.emoji}</span><span>{c.label}</span>
                  </button>
                ))}
              </div>
              {category === 'outros' && (
                <div className="mt-3">
                  <p className="text-[10px] uppercase tracking-[0.15em] text-stone-500 dark:text-stone-400 mb-2">Ícone</p>
                  <div className="grid grid-cols-8 gap-1">
                    {CUSTOM_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setCustomEmoji(emoji === customEmoji ? '' : emoji)}
                        className={`text-xl p-1.5 rounded-xl transition ${customEmoji === emoji ? 'bg-stone-900 dark:bg-white' : 'hover:bg-stone-100 dark:hover:bg-stone-800'}`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {showCard && (
            <div>
              <label className="text-[10px] uppercase tracking-[0.15em] text-stone-500 dark:text-stone-400 block mb-2">
                Cartão {userCards.length === 0 && '(cadastre na seção Cartões)'}
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => { setCardId(null); setParceladoId(null) }}
                  className={`px-3 py-2 rounded-xl text-xs flex items-center gap-2 transition ${
                    cardId === null && parceladoId === null
                      ? 'bg-stone-900 dark:bg-white text-white dark:text-stone-900'
                      : 'bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 hover:border-stone-400 dark:hover:border-stone-600 text-stone-900 dark:text-stone-100'
                  }`}
                >
                  À vista / Pix
                </button>
                {type === 'recurring' && (
                  <button
                    onClick={() => { setParceladoId('parcelado'); setCardId(null) }}
                    className={`px-3 py-2 rounded-xl text-xs flex items-center gap-2 transition ${
                      parceladoId === 'parcelado'
                        ? 'bg-stone-900 dark:bg-white text-white dark:text-stone-900'
                        : 'bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 hover:border-stone-400 dark:hover:border-stone-600 text-stone-900 dark:text-stone-100'
                    }`}
                  >
                    Parcelado
                  </button>
                )}
                {userCards.map((card) => (
                  <button
                    key={card.id}
                    onClick={() => { setCardId(card.id); setParceladoId(null) }}
                    className={`pl-1.5 pr-3 py-1 rounded-xl text-xs flex items-center gap-2 transition border ${
                      cardId === card.id ? 'text-white border-transparent' : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 hover:border-stone-400 dark:hover:border-stone-600 text-stone-900 dark:text-stone-100'
                    }`}
                    style={cardId === card.id ? { backgroundColor: card.color, borderColor: card.color } : {}}
                  >
                    <BankLogo id={card.id} size={20} />{card.name}
                  </button>
                ))}
              </div>
              {parceladoId === 'parcelado' && (() => {
                const [sy, sm] = startMonth.split('-').map(Number)
                const [vy, vm] = currentViewedMonth.split('-').map(Number)
                const elapsed = (vy - sy) * 12 + (vm - sm)
                const current = elapsed + 1
                const isValid = elapsed >= 0 && current <= numParcelas
                const isAlreadyDone = elapsed >= numParcelas
                return (
                  <div className="mt-3 space-y-3">
                    <div>
                      <label className="text-[10px] uppercase tracking-[0.15em] text-stone-500 dark:text-stone-400 block mb-2">Número de parcelas</label>
                      <div className="grid grid-cols-6 gap-2">
                        {Array.from({ length: 12 }, (_, i) => i + 1).map((p) => (
                          <button
                            key={p}
                            onClick={() => setNumParcelas(p)}
                            className={`py-2 rounded-xl text-xs transition ${
                              numParcelas === p
                                ? 'bg-stone-900 dark:bg-white text-white dark:text-stone-900'
                                : 'bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 hover:border-stone-400 dark:hover:border-stone-600 text-stone-900 dark:text-stone-100'
                            }`}
                          >
                            {p}x
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-[0.15em] text-stone-500 dark:text-stone-400 block mb-2">Mês da primeira parcela</label>
                      <input
                        type="month"
                        value={startMonth}
                        max={currentViewedMonth}
                        onChange={(e) => setStartMonth(e.target.value)}
                        className="w-full px-4 py-3 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl text-stone-900 dark:text-stone-100 focus:outline-none focus:border-stone-900 dark:focus:border-stone-300 transition"
                      />
                      <p className={`text-xs mt-2 ${isAlreadyDone ? 'text-emerald-600 dark:text-emerald-400' : !isValid ? 'text-rose-500 dark:text-rose-400' : 'text-stone-500 dark:text-stone-400'}`}>
                        {isAlreadyDone
                          ? `Parcela ${numParcelas}/${numParcelas} — quitada`
                          : !isValid
                          ? 'O mês de início não pode ser depois do mês atual'
                          : `Parcela ${current} de ${numParcelas} neste mês · ${numParcelas - current} restantes`}
                      </p>
                    </div>
                  </div>
                )
              })()}
            </div>
          )}

          <button
            onClick={handleSubmit}
            className="w-full bg-stone-900 dark:bg-white text-white dark:text-stone-900 py-3.5 rounded-full font-medium hover:bg-stone-700 dark:hover:bg-stone-200 transition mt-2"
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  )
}
