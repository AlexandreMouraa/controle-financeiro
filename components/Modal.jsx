'use client'

import { useState } from 'react'
import { CATEGORIES, CUSTOM_EMOJIS } from '@/lib/constants'
import { formatBRL, shiftMonth, monthLabel } from '@/lib/helpers'
import BankLogo from './BankLogo'

// Máscara de moeda: digita só números e os centavos vão preenchendo da direita.
const onlyDigits = (s) => String(s).replace(/\D/g, '')
const maskBRLInput = (s) => {
  const d = onlyDigits(s)
  if (!d) return ''
  return (parseInt(d, 10) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
const numToMask = (n) => (Number(n) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const parseMaskBRL = (s) => {
  const d = onlyDigits(s)
  return d ? parseInt(d, 10) / 100 : NaN
}

export default function Modal({
  type,
  onClose,
  onSubmit,
  currentIncome,
  userCards = [],
  initialValues = null,
  currentViewedMonth = '',
}) {
  const [amount, setAmount] = useState(() => {
    if (type === 'goal') return initialValues ? numToMask(initialValues.totalAmount) : ''
    if (type === 'reserve') return initialValues ? numToMask(initialValues.currentAmount) : ''
    if (initialValues) return numToMask(initialValues.amount)
    if (type === 'income' && currentIncome) return numToMask(currentIncome)
    return ''
  })
  const [description, setDescription] = useState(() => initialValues?.description || '')
  const [category, setCategory] = useState(() => initialValues?.category || 'alimentacao')
  const [dueDay, setDueDay] = useState(() => initialValues?.dueDay ? String(initialValues.dueDay) : '')
  const [reserveMonths, setReserveMonths] = useState(() => initialValues?.targetMonths || 6)
  const [date, setDate] = useState(() => initialValues?.date || new Date().toISOString().split('T')[0])
  const [cardId, setCardId] = useState(() => initialValues?.cardId || null)
  const [parceladoId, setParceladoId] = useState(() => initialValues?.parcelado ? 'parcelado' : null)
  const [numParcelas, setNumParcelas] = useState(() => initialValues?.numParcelas || 2)
  const [customEmoji, setCustomEmoji] = useState(() => initialValues?.customCategoryEmoji || '')
  const [startMonth, setStartMonth] = useState(() => initialValues?.startMonth || currentViewedMonth)
  const [goalMonths, setGoalMonths] = useState(() => initialValues?.months || 6)
  const [goalStartMonth, setGoalStartMonth] = useState(() => initialValues?.startMonth || currentViewedMonth)
  const [goalInitial, setGoalInitial] = useState(() => initialValues?.initialAmount ? numToMask(initialValues.initialAmount) : '')
  const [incomeStartMonth, setIncomeStartMonth] = useState(() =>
    type === 'income' && initialValues?.startMonth ? initialValues.startMonth : currentViewedMonth
  )
  // Anti-misclick: se o usuário já mexeu em algo, confirmar antes de fechar no clique fora.
  const [touched, setTouched] = useState(false)
  const [askDiscard, setAskDiscard] = useState(false)
  const requestClose = () => (touched ? setAskDiscard(true) : onClose())

  const titles = {
    income: initialValues ? 'Editar renda' : 'Renda principal',
    extra: initialValues ? 'Editar ganho extra' : 'Novo ganho extra',
    expense: initialValues ? 'Editar despesa' : 'Nova despesa',
    goal: initialValues ? 'Editar meta' : 'Meta de poupança',
    recurring: initialValues ? 'Editar despesa fixa' : 'Despesa fixa',
    budget: initialValues ? 'Editar orçamento' : 'Orçamento da categoria',
    reserve: initialValues ? 'Editar reserva' : 'Reserva de emergência',
  }
  const subtitles = {
    income: 'Vale para esse mês e os seguintes, até a próxima alteração.',
    extra: 'Uma entrada além da sua renda principal.',
    expense: 'Um gasto variável deste mês.',
    goal: 'Quanto você quer juntar e em quanto tempo.',
    recurring: 'Conta automaticamente todo mês.',
    budget: 'Defina um teto de gasto mensal para a categoria.',
    reserve: 'Quanto você já guardou e quantos meses quer cobrir.',
  }

  const handleSubmit = (e) => {
    if (e) e.preventDefault()
    const num = parseMaskBRL(amount)
    if (isNaN(num) || (type === 'reserve' ? num < 0 : num <= 0)) return
    if (type === 'income') {
      onSubmit({ amount: num, startMonth: incomeStartMonth })
    } else if (type === 'goal') {
      const initial = parseMaskBRL(goalInitial)
      onSubmit({ totalAmount: num, startMonth: goalStartMonth, months: goalMonths, initialAmount: isNaN(initial) || initial < 0 ? 0 : initial })
    } else if (type === 'budget') {
      onSubmit({ amount: num, category })
    } else if (type === 'reserve') {
      onSubmit({ currentAmount: num, targetMonths: reserveMonths })
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
        if (dueDay) rPayload.dueDay = parseInt(dueDay, 10)
      }
      onSubmit(rPayload)
    }
  }

  const showDescription = type === 'extra' || type === 'expense' || type === 'recurring'
  const showDate = type === 'extra' || type === 'expense'
  const showCategory = type === 'expense' || type === 'recurring' || type === 'budget'
  const showCard = type === 'expense' || type === 'recurring'
  const amountLabel =
    type === 'goal' ? 'Valor total (R$)'
    : type === 'budget' ? 'Teto mensal (R$)'
    : type === 'reserve' ? 'Valor já guardado (R$)'
    : 'Valor (R$)'

  return (
    <div className="overlay" onClick={requestClose}>
      <form
        className="modal"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        onInput={() => setTouched(true)}
        onChangeCapture={() => setTouched(true)}
      >
        <h3>{titles[type]}</h3>
        <div className="sub">{subtitles[type]}</div>

        {showDescription && (
          <div className="field">
            <label>Descrição</label>
            <input
              autoFocus
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={type === 'extra' ? 'Ex.: Freela de design' : type === 'recurring' ? 'Ex.: Aluguel, Netflix, Internet' : 'Ex.: Mercado'}
            />
          </div>
        )}

        <div className="field">
          <label>{amountLabel}</label>
          <input
            className="mono"
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(maskBRLInput(e.target.value))}
            placeholder="0,00"
            autoFocus={!showDescription}
          />
        </div>

        {type === 'income' && (
          <div className="field">
            <label>A partir de</label>
            <input type="month" value={incomeStartMonth} onChange={(e) => setIncomeStartMonth(e.target.value)} />
          </div>
        )}

        {type === 'goal' && (
          <>
            <div className="field">
              <label>A partir de</label>
              <input type="month" value={goalStartMonth} onChange={(e) => setGoalStartMonth(e.target.value)} />
            </div>
            <div className="field">
              <label>Valor já guardado (R$) <span style={{ fontWeight: 400, color: 'var(--faint)' }}>· opcional</span></label>
              <input
                className="mono"
                inputMode="numeric"
                value={goalInitial}
                onChange={(e) => setGoalInitial(maskBRLInput(e.target.value))}
                placeholder="0,00"
              />
              <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>
                Quanto você já tem guardado pra essa meta hoje. Entra como ponto de partida.
              </p>
            </div>
            <div className="field">
              <label>Em quantos meses</label>
              <div className="chip-select">
                {[3, 6, 12, 18, 24, 36].map((p) => (
                  <button type="button" key={p} className={goalMonths === p ? 'sel' : ''} onClick={() => setGoalMonths(p)}>{p}</button>
                ))}
              </div>
              {(() => {
                const num = parseMaskBRL(amount)
                const endLabel = monthLabel(shiftMonth(goalStartMonth, goalMonths - 1))
                const pace = !isNaN(num) && num > 0 ? formatBRL(num / goalMonths) : null
                return (
                  <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8, textTransform: 'capitalize' }}>
                    Termina em {endLabel}<span style={{ textTransform: 'lowercase' }}>{pace ? ` · ${pace}/mês pra fechar` : ''}</span>
                  </p>
                )
              })()}
            </div>
          </>
        )}

        {type === 'reserve' && (
          <div className="field">
            <label>Meses de despesa fixa pra cobrir</label>
            <div className="chip-select">
              {[3, 6, 9, 12, 18, 24].map((p) => (
                <button type="button" key={p} className={reserveMonths === p ? 'sel' : ''} onClick={() => setReserveMonths(p)}>{p}</button>
              ))}
            </div>
            <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>
              A meta é {reserveMonths} {reserveMonths === 1 ? 'mês' : 'meses'} das suas despesas fixas. O ideal costuma ser de 3 a 6 meses.
            </p>
          </div>
        )}

        {showDate && (
          <div className="field">
            <label>Data</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        )}

        {showCategory && (
          <div className="field">
            <label>Categoria</label>
            <div className="chip-select">
              {CATEGORIES.map((c) => (
                <button
                  type="button"
                  key={c.id}
                  className={category === c.id ? 'sel' : ''}
                  onClick={() => { setCategory(c.id); if (c.id !== 'outros') setCustomEmoji('') }}
                >
                  <span>{c.emoji}</span><span>{c.label}</span>
                </button>
              ))}
            </div>
            {category === 'outros' && (
              <div style={{ marginTop: 12 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-soft)', display: 'block', marginBottom: 7 }}>Ícone</label>
                <div className="chip-select">
                  {CUSTOM_EMOJIS.map((emoji) => (
                    <button type="button" key={emoji} className={customEmoji === emoji ? 'sel' : ''} onClick={() => setCustomEmoji(emoji === customEmoji ? '' : emoji)} style={{ fontSize: 18, padding: '6px 10px' }}>
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {showCard && (
          <div className="field">
            <label>Cartão {userCards.length === 0 && '(cadastre na seção Cartões)'}</label>
            <div className="chip-select">
              <button type="button" className={cardId === null && parceladoId === null ? 'sel' : ''} onClick={() => { setCardId(null); setParceladoId(null) }}>
                À vista / Pix
              </button>
              {type === 'recurring' && (
                <button type="button" className={parceladoId === 'parcelado' ? 'sel' : ''} onClick={() => { setParceladoId('parcelado'); setCardId(null) }}>
                  Parcelado
                </button>
              )}
              {userCards.map((card) => (
                <button type="button" key={card.id} className={cardId === card.id ? 'sel' : ''} onClick={() => { setCardId(card.id); setParceladoId(null) }}>
                  <BankLogo id={card.id} size={18} />{card.name}
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
                <div style={{ marginTop: 14 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-soft)', display: 'block', marginBottom: 7 }}>Número de parcelas</label>
                  <div className="chip-select">
                    {[2, 3, 6, 10, 12, 24, 36, 48, 60].map((p) => (
                      <button type="button" key={p} className={numParcelas === p ? 'sel' : ''} onClick={() => setNumParcelas(p)}>{p}x</button>
                    ))}
                  </div>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={numParcelas}
                    onChange={(e) => {
                      const n = Math.max(1, Math.min(60, parseInt(e.target.value, 10) || 1))
                      setNumParcelas(n)
                    }}
                    style={{ marginTop: 8 }}
                  />
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-soft)', display: 'block', margin: '14px 0 7px' }}>Mês da primeira parcela</label>
                  <input type="month" value={startMonth} max={currentViewedMonth} onChange={(e) => setStartMonth(e.target.value)} />
                  <p style={{ fontSize: 12, marginTop: 8, color: isAlreadyDone ? 'var(--accent-ink)' : !isValid ? 'var(--debt)' : 'var(--muted)' }}>
                    {isAlreadyDone
                      ? `Parcela ${numParcelas}/${numParcelas} — quitada`
                      : !isValid
                      ? 'O mês de início não pode ser depois do mês atual'
                      : `Parcela ${current} de ${numParcelas} neste mês · ${numParcelas - current} restantes`}
                  </p>
                </div>
              )
            })()}
          </div>
        )}

        {type === 'recurring' && parceladoId !== 'parcelado' && (
          <div className="field">
            <label>Dia de vencimento (opcional)</label>
            <input
              type="number"
              inputMode="numeric"
              min="1"
              max="31"
              value={dueDay}
              onChange={(e) => {
                const v = e.target.value
                if (v === '') return setDueDay('')
                const n = Math.max(1, Math.min(31, parseInt(v, 10) || 1))
                setDueDay(String(n))
              }}
              placeholder="Ex.: 10"
            />
            <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 7 }}>Dia do mês em que essa conta vence. O app avisa quando estiver chegando.</p>
          </div>
        )}

        <div className="modal-actions">
          <button type="button" className="btn-cancel" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn-solid">Salvar</button>
        </div>
      </form>

      {askDiscard && (
        <div className="overlay" style={{ zIndex: 65 }} onClick={(e) => { e.stopPropagation(); setAskDiscard(false) }}>
          <div className="modal" style={{ maxWidth: 380 }} onClick={(e) => e.stopPropagation()}>
            <h3>Descartar alterações?</h3>
            <div className="sub">Você tem mudanças não salvas. Se sair agora, elas serão perdidas.</div>
            <div className="modal-actions">
              <button type="button" className="btn-cancel" onClick={() => setAskDiscard(false)}>Continuar editando</button>
              <button type="button" className="btn-solid" style={{ background: 'var(--debt)' }} onClick={onClose}>Descartar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
