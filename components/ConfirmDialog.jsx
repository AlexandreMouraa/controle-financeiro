'use client'

import { AlertTriangle } from 'lucide-react'

export default function ConfirmDialog({ state, onConfirm, onCancel }) {
  if (!state) return null
  return (
    <div className="overlay" style={{ zIndex: 70 }} onClick={onCancel}>
      <div className="modal" style={{ maxWidth: 380 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 9, flexShrink: 0, display: 'grid', placeItems: 'center',
            background: 'var(--warn-bg)', color: 'var(--warn)',
          }}>
            <AlertTriangle size={16} />
          </div>
          <p style={{ fontSize: 14, color: 'var(--ink-soft)' }}>{state.message}</p>
        </div>
        <div className="modal-actions">
          <button type="button" className="btn-cancel" onClick={onCancel}>Cancelar</button>
          <button
            type="button"
            className="btn-solid"
            style={{ background: 'var(--debt)' }}
            onClick={onConfirm}
          >
            {state.confirmLabel || 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  )
}
