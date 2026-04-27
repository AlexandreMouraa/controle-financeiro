'use client'

import { X, Check } from 'lucide-react'
import { DEFAULT_CARDS } from '@/lib/constants'
import BankLogo from './BankLogo'

export default function CardsModal({ onClose, activeCards, onToggle }) {
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
            <h3 className="text-2xl font-medium tracking-tight text-stone-900 dark:text-stone-100">Seus cartões</h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">Toque pra ativar/desativar</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-stone-200 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 flex items-center justify-center flex-shrink-0" aria-label="Fechar">
            <X size={16} />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {DEFAULT_CARDS.map((card) => {
            const active = activeCards.includes(card.id)
            return (
              <button
                key={card.id}
                onClick={() => onToggle(card.id)}
                className={`pl-2 pr-3 py-2.5 rounded-xl text-sm flex items-center gap-2 transition border-2 ${
                  active ? 'text-white border-transparent' : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 hover:border-stone-400 dark:hover:border-stone-600 text-stone-900 dark:text-stone-100'
                }`}
                style={active ? { backgroundColor: card.color, borderColor: card.color } : {}}
              >
                <BankLogo id={card.id} size={26} />
                <span className="truncate text-left flex-1">{card.name}</span>
                {active && <Check size={14} className="flex-shrink-0" />}
              </button>
            )
          })}
        </div>
        <button onClick={onClose} className="w-full bg-stone-900 dark:bg-white text-white dark:text-stone-900 py-3 rounded-full font-medium hover:bg-stone-700 dark:hover:bg-stone-200 transition mt-5">
          Pronto
        </button>
      </div>
    </div>
  )
}
