import AuthGuard from '@/components/AuthGuard'
import FinanceTracker from '@/components/FinanceTracker'

export default function Home() {
  return (
    <AuthGuard>
      <FinanceTracker />
    </AuthGuard>
  )
}
