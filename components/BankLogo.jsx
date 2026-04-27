import { DEFAULT_CARDS } from '@/lib/constants'

const BANK_LOGOS = {
  nubank: (<><rect width="32" height="32" rx="8" fill="#8A05BE" /><text x="16" y="22" textAnchor="middle" fontSize="18" fontWeight="900" fill="white" fontFamily="system-ui, -apple-system, sans-serif">N</text></>),
  santander: (<><rect width="32" height="32" rx="8" fill="#EC0000" /><path d="M16 7 C12 11, 12 15, 16 18 C20 15, 20 11, 16 7 Z" fill="white" /><path d="M16 14 C13.5 17, 13.5 21, 16 24 C18.5 21, 18.5 17, 16 14 Z" fill="white" fillOpacity="0.7" /></>),
  c6: (<><rect width="32" height="32" rx="8" fill="#1a1a1a" /><text x="16" y="21" textAnchor="middle" fontSize="14" fontWeight="900" fill="#D4AF37" fontFamily="system-ui, -apple-system, sans-serif" letterSpacing="-0.5">C6</text></>),
  itau: (<><rect width="32" height="32" rx="8" fill="#EC7000" /><text x="16" y="23" textAnchor="middle" fontSize="20" fontWeight="900" fill="#003DA5" fontFamily="system-ui, -apple-system, sans-serif">i</text></>),
  bradesco: (<><rect width="32" height="32" rx="8" fill="#CC092F" /><polygon points="16,8 24,24 8,24" fill="white" /></>),
  bb: (<><rect width="32" height="32" rx="8" fill="#F8C300" /><text x="16" y="21" textAnchor="middle" fontSize="13" fontWeight="900" fill="#003DA5" fontFamily="system-ui, -apple-system, sans-serif" letterSpacing="-0.5">BB</text></>),
  caixa: (<><rect width="32" height="32" rx="8" fill="#0070AF" /><path d="M8 22 L12 10 L16 18 L20 10 L24 22" stroke="#F39200" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" /></>),
  inter: (<><rect width="32" height="32" rx="8" fill="#FF7A00" /><text x="16" y="22" textAnchor="middle" fontSize="16" fontWeight="900" fill="white" fontFamily="system-ui, -apple-system, sans-serif">in</text></>),
  will: (<><rect width="32" height="32" rx="8" fill="#41E68A" /><text x="16" y="22" textAnchor="middle" fontSize="16" fontWeight="900" fill="#1a1a1a" fontFamily="system-ui, -apple-system, sans-serif">W</text></>),
  picpay: (<><rect width="32" height="32" rx="8" fill="#21C25E" /><text x="16" y="23" textAnchor="middle" fontSize="18" fontWeight="900" fill="white" fontFamily="system-ui, -apple-system, sans-serif">$</text></>),
  mercadopago: (<><rect width="32" height="32" rx="8" fill="#00B1EA" /><ellipse cx="16" cy="17" rx="9" ry="5" fill="#FFE600" /><circle cx="13" cy="17" r="1.2" fill="#00B1EA" /><circle cx="19" cy="17" r="1.2" fill="#00B1EA" /></>),
  btg: (<><rect width="32" height="32" rx="8" fill="#0F2D40" /><text x="16" y="20" textAnchor="middle" fontSize="9" fontWeight="900" fill="#C19B5C" fontFamily="system-ui, -apple-system, sans-serif" letterSpacing="-0.3">BTG</text></>),
  next: (<><rect width="32" height="32" rx="8" fill="#00FF59" /><text x="16" y="22" textAnchor="middle" fontSize="18" fontWeight="900" fill="#1a1a1a" fontFamily="system-ui, -apple-system, sans-serif">n</text></>),
  pan: (<><rect width="32" height="32" rx="8" fill="#0077C0" /><text x="16" y="20" textAnchor="middle" fontSize="9" fontWeight="900" fill="white" fontFamily="system-ui, -apple-system, sans-serif" letterSpacing="-0.3">PAN</text></>),
}

export default function BankLogo({ id, size = 24, className = '' }) {
  const logo = BANK_LOGOS[id]
  const card = DEFAULT_CARDS.find((c) => c.id === id)
  if (!logo) {
    return (
      <div
        className={`rounded-md flex-shrink-0 ${className}`}
        style={{ width: size, height: size, backgroundColor: card?.color || '#999' }}
      />
    )
  }
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={`flex-shrink-0 ${className}`}>
      {logo}
    </svg>
  )
}
