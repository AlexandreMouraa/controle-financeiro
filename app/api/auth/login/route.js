import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase'

const supabase = createServerSupabase()

export async function POST(request) {
  const { email, password } = await request.json()

  if (!email || !password) {
    return NextResponse.json({ error: 'Email e senha são obrigatórios.' }, { status: 400 })
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    console.log('Supabase auth error:', error.message, error.status)
    return NextResponse.json({ error: 'Email ou senha incorretos.' }, { status: 401 })
  }

  return NextResponse.json({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  })
}
