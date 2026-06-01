'use client'

import { useEffect } from 'react'
import { AlertCircle, CheckCircle2, X } from 'lucide-react'

function Toast({ toast, onDismiss }) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), 4500)
    return () => clearTimeout(timer)
  }, [toast.id, onDismiss])

  const isError = toast.type === 'error'
  const c = isError ? 'var(--debt)' : 'var(--accent-ink)'
  const bg = isError ? 'var(--debt-bg)' : 'var(--accent-bg)'
  return (
    <div
      className="animate-fade-in-up"
      style={{
        pointerEvents: 'auto', display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 15px', borderRadius: 12, fontSize: 13.5, color: c, background: bg,
        border: `1px solid color-mix(in oklab, ${c} 25%, transparent)`, boxShadow: 'var(--shadow)',
      }}
    >
      {isError ? <AlertCircle size={16} style={{ flexShrink: 0 }} /> : <CheckCircle2 size={16} style={{ flexShrink: 0 }} />}
      <p style={{ flex: 1 }}>{toast.message}</p>
      <button onClick={() => onDismiss(toast.id)} style={{ opacity: 0.6 }} aria-label="Fechar"><X size={14} /></button>
    </div>
  )
}

export default function ToastContainer({ toasts, onDismiss }) {
  return (
    <div style={{
      position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 80,
      display: 'flex', flexDirection: 'column', gap: 8, width: 'calc(100% - 2rem)', maxWidth: 380, pointerEvents: 'none',
    }}>
      {toasts.map((t) => (
        <Toast key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  )
}
