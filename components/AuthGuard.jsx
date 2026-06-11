'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AuthGuard({ children }) {
  const router = useRouter()
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    let active = true
    // getUser valida a sessão no servidor; getSession só lê o localStorage e
    // deixa passar sessão expirada/revogada (dashboard vazio + erro ao salvar)
    supabase.auth.getUser()
      .then(({ data: { user } }) => {
        if (!active) return
        if (!user) {
          // sessão ausente ou podre: limpa o storage antes de voltar pro login
          supabase.auth.signOut({ scope: 'local' }).catch(() => {})
          router.replace('/login')
        } else {
          setChecked(true)
        }
      })
      .catch(() => { if (active) router.replace('/login') })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        router.replace('/login')
      }
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [router])

  if (!checked) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <p style={{ color: 'var(--muted)', fontSize: 14 }}>Carregando…</p>
      </div>
    )
  }

  return children
}
