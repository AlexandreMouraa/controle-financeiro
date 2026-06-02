import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase'

const supabase = createServerSupabase()

export async function POST(request) {
  const { email, password } = await request.json()

  if (!email || !password) {
    return NextResponse.json({ error: 'Email e senha são obrigatórios.' }, { status: 400 })
  }

  const { data, error } = await supabase.auth.signUp({ email, password })

  if (error) {
    console.log('Supabase signup error:', error.message, error.status)
    // Não devolve a mensagem crua do Supabase: "User already registered" permite
    // enumerar emails cadastrados. Mapeia só o que é seguro/útil; resto genérico.
    // (Anti-enumeração de verdade depende da confirmação de email estar ligada.)
    if (error.status === 429) {
      return NextResponse.json({ error: 'Muitas tentativas. Aguarde um instante e tente de novo.' }, { status: 429 })
    }
    if (/password/i.test(error.message)) {
      return NextResponse.json({ error: 'A senha precisa ter no mínimo 6 caracteres.' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Não foi possível criar a conta. Verifique os dados e tente novamente.' }, { status: 400 })
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
