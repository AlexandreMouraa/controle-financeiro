'use client'

import { Check } from 'lucide-react'
import { DEFAULT_CARDS } from '@/lib/constants'
import BankLogo from './BankLogo'

export default function CardsModal({ onClose, activeCards, onToggle }) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Seus cartões</h3>
        <div className="sub">Toque pra ativar ou desativar.</div>
        <div className="chip-select" style={{ gap: 9 }}>
          {DEFAULT_CARDS.map((card) => {
            const active = activeCards.includes(card.id)
            return (
              <button
                key={card.id}
                type="button"
                className={active ? 'sel' : ''}
                onClick={() => onToggle(card.id)}
                style={{ padding: '8px 13px' }}
              >
                <BankLogo id={card.id} size={20} />
                <span>{card.name}</span>
                {active && <Check size={14} />}
              </button>
            )
          })}
        </div>
        <div className="modal-actions">
          <button type="button" className="btn-solid" onClick={onClose}>Pronto</button>
        </div>
      </div>
    </div>
  )
}
