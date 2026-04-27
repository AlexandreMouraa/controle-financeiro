'use client'

import { X, Trash2, Pencil } from 'lucide-react'
import { formatBRL, monthLabel } from '@/lib/helpers'

export default function IncomeHistoryModal({ onClose, incomeHistory, onRemove, onEdit }) {
  const sorted = [...incomeHistory].sort((a, b) => b.startMonth.localeCompare(a.startMonth))
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
            <h3 className="text-2xl font-medium tracking-tight text-stone-900 dark:text-stone-100">Histórico de renda</h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">Cada entrada vale a partir do mês indicado</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-stone-200 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 flex items-center justify-center flex-shrink-0" aria-label="Fechar">
            <X size={16} />
          </button>
        </div>
        {sorted.length === 0 ? (
          <p className="text-sm text-stone-500 dark:text-stone-400 text-center py-8">Nenhuma renda registrada ainda.</p>
        ) : (
          <ul className="divide-y divide-stone-200 dark:divide-stone-800 border border-stone-200 dark:border-stone-800 rounded-2xl overflow-hidden">
            {sorted.map((entry) => (
              <li key={entry.startMonth} className="p-4 flex items-center justify-between gap-3 bg-white dark:bg-stone-900">
                <div className="min-w-0">
                  <p className="text-sm font-medium capitalize">{monthLabel(entry.startMonth)}</p>
                  <p className="text-xs text-stone-500 dark:text-stone-400">A partir de {entry.startMonth}</p>
                </div>
                <div className="flex items-center gap-1">
                  <p className="text-sm font-semibold whitespace-nowrap mr-2">{formatBRL(entry.amount)}</p>
                  <button onClick={() => onEdit(entry)} className="text-stone-300 dark:text-stone-600 hover:text-stone-700 dark:hover:text-stone-300 p-1.5 transition" aria-label="Editar">
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={() => { if (confirm(`Remover renda de ${monthLabel(entry.startMonth)}?`)) onRemove(entry.startMonth) }}
                    className="text-stone-300 dark:text-stone-600 hover:text-rose-600 dark:hover:text-rose-500 p-1.5 transition"
                    aria-label="Remover"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <button onClick={onClose} className="w-full bg-stone-900 dark:bg-white text-white dark:text-stone-900 py-3 rounded-full font-medium hover:bg-stone-700 dark:hover:bg-stone-200 transition mt-5">
          Pronto
        </button>
      </div>
    </div>
  )
}
