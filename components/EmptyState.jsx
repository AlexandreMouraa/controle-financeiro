import { Wallet, Plus } from 'lucide-react'

export default function EmptyState({ onAddIncome, onAddExpense }) {
  return (
    <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-8 text-center animate-fade-in-up">
      <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center mb-4">
        <Wallet size={24} className="text-emerald-700 dark:text-emerald-400" />
      </div>
      <h2 className="text-xl font-medium tracking-tight mb-1">Bora começar?</h2>
      <p className="text-sm text-stone-500 dark:text-stone-400 mb-6 max-w-xs mx-auto">
        Defina sua renda do mês e comece a registrar pra ver pra onde a grana tá indo.
      </p>
      <div className="flex flex-col sm:flex-row gap-2 max-w-sm mx-auto">
        <button
          onClick={onAddIncome}
          className="flex-1 bg-stone-900 dark:bg-white text-white dark:text-stone-900 py-3 rounded-full text-sm font-medium hover:bg-stone-700 dark:hover:bg-stone-200 transition"
        >
          Definir renda
        </button>
        <button
          onClick={onAddExpense}
          className="flex-1 bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100 py-3 rounded-full text-sm font-medium hover:bg-stone-200 dark:hover:bg-stone-700 transition flex items-center justify-center gap-2"
        >
          <Plus size={14} /> Adicionar despesa
        </button>
      </div>
    </div>
  )
}
