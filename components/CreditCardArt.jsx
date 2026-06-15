import { DEFAULT_CARDS } from '@/lib/constants'
import BankLogo from './BankLogo'

// Cartão estilizado (arte própria) com a cara de um cartão de verdade:
// gradiente da cor do banco, chip EMV detalhado, contactless, logo e "•••• ••••".
export default function CreditCardArt({ id, name, className = '' }) {
  const card = DEFAULT_CARDS.find((c) => c.id === id)
  const color = card?.color || '#555'
  const label = name || card?.name || id
  // gradiente diagonal: cor do banco -> versão mais escura da mesma cor
  const bg = `linear-gradient(135deg, ${color} 0%, color-mix(in oklab, ${color} 62%, #000) 100%)`
  // texto claro por padrão; bancos de fundo muito claro usam tinta escura
  const lightBg = ['bb', 'will', 'next'].includes(id)
  const ink = lightBg ? '#1a1a1a' : '#fff'

  return (
    <div className={`cc-art ${className}`} style={{ background: bg, color: ink }}>
      <div className="cc-tex" />
      <div className="cc-shine" />
      <div className="cc-top">
        <span className="cc-logo"><BankLogo id={id} size={34} /></span>
      </div>
      <div className="cc-mid">
        <span className="cc-chip" aria-hidden />
        <svg className="cc-wave" width="22" height="26" viewBox="0 0 22 26" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
          <path d="M5 8a8 8 0 0 1 0 10" />
          <path d="M9 5a13 13 0 0 1 0 16" />
          <path d="M13 2a18 18 0 0 1 0 22" />
        </svg>
      </div>
      <div className="cc-dots">
        <span>••••</span><span>••••</span><span>••••</span><span>••••</span>
      </div>
      <div className="cc-name">{label}</div>
    </div>
  )
}
