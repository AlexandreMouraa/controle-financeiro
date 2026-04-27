'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Mail, Lock, Eye, EyeOff, Sun, Moon, ArrowRight } from 'lucide-react'
import { THEME_KEY } from '@/lib/constants'
import { supabase } from '@/lib/supabase'

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [theme, setTheme] = useState('light')
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem(THEME_KEY)
      if (savedTheme === 'dark' || savedTheme === 'light') {
        setTheme(savedTheme)
      } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        setTheme('dark')
      }
    } catch (e) { console.error('Erro ao carregar tema:', e) }
    setLoaded(true)
  }, [])

  useEffect(() => {
    if (!loaded) return
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace('/')
    })
  }, [loaded, router])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    if (loaded) localStorage.setItem(THEME_KEY, theme)
  }, [theme, loaded])

  const toggleTheme = () => setTheme((t) => (t === 'light' ? 'dark' : 'light'))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!email.trim() || !password || !confirmPassword) {
      setError('Preencha todos os campos.')
      return
    }
    if (password !== confirmPassword) {
      setError('As senhas não coincidem.')
      return
    }
    if (password.length < 6) {
      setError('A senha precisa ter no mínimo 6 caracteres.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const json = await res.json()

      if (!res.ok) {
        setError(json.error ?? 'Erro ao criar conta.')
        return
      }

      if (json.confirm_email) {
        setSuccess(true)
        return
      }

      await supabase.auth.setSession({
        access_token: json.access_token,
        refresh_token: json.refresh_token,
      })
      router.replace('/')
    } catch {
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 transition-colors flex items-center justify-center px-5 py-10">
      <div className="w-full max-w-md">

        <div className="flex items-center justify-between mb-1">
          <p className="text-xs uppercase tracking-[0.2em] text-stone-500 dark:text-stone-400">Cadastro</p>
          <button
            onClick={toggleTheme}
            className="w-7 h-7 rounded-full flex items-center justify-center bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 hover:bg-stone-100 dark:hover:bg-stone-800 transition text-stone-700 dark:text-stone-300"
            aria-label="Alternar tema"
          >
            {theme === 'dark' ? <Sun size={13} /> : <Moon size={13} />}
          </button>
        </div>

        <h1 className="text-3xl mb-1 font-light tracking-tight">
          Crie sua <em className="not-italic font-semibold">conta</em>
        </h1>
        <p className="text-sm text-stone-500 dark:text-stone-400 mb-6">
          Comece a controlar suas finanças agora.
        </p>

        {success ? (
          <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-6 text-center space-y-3">
            <p className="text-2xl">📬</p>
            <p className="font-medium text-stone-900 dark:text-stone-100">Confirme seu email</p>
            <p className="text-sm text-stone-500 dark:text-stone-400">
              Enviamos um link de confirmação para <strong className="text-stone-700 dark:text-stone-300">{email}</strong>. Acesse seu email e clique no link pra ativar sua conta.
            </p>
            <a
              href="/login"
              className="inline-block mt-2 text-sm text-stone-900 dark:text-stone-100 font-medium underline-offset-4 hover:underline"
            >
              Voltar para o login
            </a>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-6 space-y-4"
          >
            <div>
              <label className="text-[10px] uppercase tracking-[0.15em] text-stone-500 dark:text-stone-400 block mb-2">Email</label>
              <div className="relative">
                <Mail size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 dark:text-stone-500" />
                <input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="voce@exemplo.com"
                  autoFocus
                  className="w-full pl-11 pr-4 py-3 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-2xl text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-600 focus:outline-none focus:border-stone-900 dark:focus:border-stone-300 transition"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-[0.15em] text-stone-500 dark:text-stone-400 block mb-2">Senha</label>
              <div className="relative">
                <Lock size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 dark:text-stone-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full pl-11 pr-12 py-3 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-2xl text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-600 focus:outline-none focus:border-stone-900 dark:focus:border-stone-300 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center text-stone-400 dark:text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
                  aria-label={showPassword ? 'Esconder senha' : 'Mostrar senha'}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-[0.15em] text-stone-500 dark:text-stone-400 block mb-2">Confirmar senha</label>
              <div className="relative">
                <Lock size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 dark:text-stone-500" />
                <input
                  type={showConfirm ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita a senha"
                  className="w-full pl-11 pr-12 py-3 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-2xl text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-600 focus:outline-none focus:border-stone-900 dark:focus:border-stone-300 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center text-stone-400 dark:text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
                  aria-label={showConfirm ? 'Esconder senha' : 'Mostrar senha'}
                >
                  {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/40 rounded-2xl px-4 py-3">
                <p className="text-xs text-rose-700 dark:text-rose-300">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-stone-900 dark:bg-white text-white dark:text-stone-900 py-3.5 rounded-full font-medium hover:bg-stone-700 dark:hover:bg-stone-200 transition flex items-center justify-center gap-2 shadow-lg shadow-stone-900/20 dark:shadow-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Criando conta…' : <><span>Criar conta</span><ArrowRight size={16} /></>}
            </button>
          </form>
        )}

        <p className="text-center text-sm text-stone-500 dark:text-stone-400 mt-5">
          Já tem conta?{' '}
          <a href="/login" className="text-stone-900 dark:text-stone-100 font-medium underline-offset-4 hover:underline">
            Entrar
          </a>
        </p>
      </div>
    </div>
  )
}
