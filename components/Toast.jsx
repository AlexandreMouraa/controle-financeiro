'use client'

import { useEffect } from 'react'
import { AlertCircle, CheckCircle2, X } from 'lucide-react'

function Toast({ toast, onDismiss }) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), 4500)
    return () => clearTimeout(timer)
  }, [toast.id, onDismiss])

  const isError = toast.type === 'error'
  return (
    <div
      className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-lg text-sm ${
        isError
          ? 'bg-rose-50 dark:bg-rose-950/70 border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-200'
          : 'bg-emerald-50 dark:bg-emerald-950/70 border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-200'
      }`}
    >
      {isError ? <AlertCircle size={16} className="flex-shrink-0" /> : <CheckCircle2 size={16} className="flex-shrink-0" />}
      <p className="flex-1">{toast.message}</p>
      <button onClick={() => onDismiss(toast.id)} className="opacity-60 hover:opacity-100 transition" aria-label="Fechar">
        <X size={14} />
      </button>
    </div>
  )
}

export default function ToastContainer({ toasts, onDismiss }) {
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] flex flex-col gap-2 w-[calc(100%-2rem)] max-w-sm pointer-events-none">
      {toasts.map((t) => (
        <Toast key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  )
}
