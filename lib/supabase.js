import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Supabase não configurado: defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY no .env.'
  )
}

// Cliente do navegador — persiste a sessão (localStorage) e renova o token.
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Cliente para rotas de API (server-side): sem persistência de sessão.
export const createServerSupabase = () =>
  createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
