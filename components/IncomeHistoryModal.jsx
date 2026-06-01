'use client'

import { Trash2, Pencil } from 'lucide-react'
import { formatBRL, monthLabel } from '@/lib/helpers'

export default function IncomeHistoryModal({ onClose, incomeHistory, onRemove, onEdit }) {
  const sorted = [...incomeHistory].sort((a, b) => b.startMonth.localeCompare(a.startMonth))
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Histórico de renda</h3>
        <div className="sub">Cada entrada vale a partir do mês indicado.</div>
        {sorted.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center', padding: '24px 0' }}>Nenhuma renda registrada ainda.</p>
        ) : (
          <div className="rows" style={{ margin: '4px 0 0' }}>
            {sorted.map((entry) => (
              <div className="row" key={entry.startMonth}>
                <div className="main">
                  <div style={{ minWidth: 0 }}>
                    <div className="nm" style={{ textTransform: 'capitalize' }}>{monthLabel(entry.startMonth)}</div>
                    <div className="tag">A partir de {entry.startMonth}</div>
                  </div>
                </div>
                <div className="amt neg">{formatBRL(entry.amount)}</div>
                <div className="row-actions" style={{ opacity: 1, width: 'auto' }}>
                  <button onClick={() => onEdit(entry)} aria-label="Editar"><Pencil size={14} /></button>
                  <button className="del" onClick={() => onRemove(entry.startMonth)} aria-label="Remover"><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="modal-actions">
          <button type="button" className="btn-solid" onClick={onClose}>Pronto</button>
        </div>
      </div>
    </div>
  )
}
