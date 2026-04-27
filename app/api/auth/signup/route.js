import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export async function POST(request) {
  const { email, password } = await request.json()

  if (!email || !password) {
    return NextResponse.json({ error: 'Email e senha são obrigatórios.' }, { status: 400 })
  }

  const { data, error } = await supabase.auth.signUp({ email, password })

  if (error) {
    console.log('Supabase signup error:', error.message, error.status)
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  // Se confirmação de email estiver desativada, a sessão já vem pronta
  if (data.session) {
    return NextResponse.json({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    })
  }

  // Se confirmação de email estiver ativada, informa o usuário
  return NextResponse.json({ confirm_email: true })
}
