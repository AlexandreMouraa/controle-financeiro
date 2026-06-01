import { Wallet, Plus } from 'lucide-react'

export default function EmptyState({ onAddIncome, onAddExpense }) {
  return (
    <div className="card" style={{ padding: 32, textAlign: 'center' }}>
      <div style={{
        width: 56, height: 56, margin: '0 auto 16px', borderRadius: 14, display: 'grid', placeItems: 'center',
        background: 'var(--accent-bg)', color: 'var(--accent-ink)',
      }}>
        <Wallet size={24} />
      </div>
      <h2 className="serif" style={{ fontSize: 26, fontWeight: 500, marginBottom: 6 }}>Bora começar?</h2>
      <p style={{ fontSize: 14, color: 'var(--muted)', maxWidth: 340, margin: '0 auto 22px', lineHeight: 1.5 }}>
        Defina sua renda do mês e comece a registrar pra ver pra onde a grana tá indo.
      </p>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
        <button className="btn-solid" style={{ flex: 'none', padding: '12px 22px' }} onClick={onAddIncome}>Definir renda</button>
        <button className="btn-ghost" onClick={onAddExpense}><Plus size={15} /> Adicionar despesa</button>
      </div>
    </div>
  )
}
