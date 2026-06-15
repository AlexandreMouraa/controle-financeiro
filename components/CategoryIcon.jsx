import {
  Utensils, Bus, Home, Film, Pill, CreditCard, Smartphone, Package,
} from 'lucide-react'

// Ícone (Lucide, linha) de cada categoria — substitui os emojis.
const CATEGORY_ICONS = {
  alimentacao: Utensils,
  transporte: Bus,
  moradia: Home,
  lazer: Film,
  saude: Pill,
  dividas: CreditCard,
  assinaturas: Smartphone,
  outros: Package,
}

export default function CategoryIcon({ id, size = 18, color, className = '', strokeWidth = 2 }) {
  const Icon = CATEGORY_ICONS[id] || Package
  return <Icon size={size} color={color} strokeWidth={strokeWidth} className={className} />
}
