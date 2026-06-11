'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Mail, Lock, Eye, EyeOff, Sun, Moon, ArrowRight } from 'lucide-react'
import { THEME_KEY } from '@/lib/constants'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [theme, setTheme] = useState('light')
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)

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
    let active = true
    // getUser valida a sessão no servidor (getSession só lê o localStorage e
    // deixa passar sessão expirada/revogada, causando loop de redirect)
    supabase.auth.getUser()
      .then(({ data: { user } }) => {
        if (!active) return
        if (user) { router.replace('/'); return }
        // sessão podre no storage: limpa pra não redirecionar de novo
        supabase.auth.signOut({ scope: 'local' }).catch(() => {})
        setChecking(false)
      })
      .catch(() => { if (active) setChecking(false) })
    return () => { active = false }
  }, [loaded, router])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    if (loaded) localStorage.setItem(THEME_KEY, theme)
  }, [theme, loaded])

  const toggleTheme = () => setTheme((t) => (t === 'light' ? 'dark' : 'light'))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!email.trim() || !password) {
      setError('Preencha email e senha pra continuar.')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? 'Erro ao fazer login.')
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

  if (!loaded || checking) return <div className="auth-page" aria-busy="true" />

  return (
    <div className="auth-page">
      <div className="auth-card">

        <div className="auth-head">
          <span className="brand"><span className="logo"><span className="dot" />Fin<em style={{ fontStyle: 'normal', color: 'var(--accent-ink)' }}>Track</em></span></span>
          <button className="icon-btn" onClick={toggleTheme} aria-label="Alternar tema" style={{ width: 34, height: 34, borderRadius: 9 }}>
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        </div>

        <p className="eyebrow" style={{ marginTop: 4 }}>Acesso</p>
        <h1 className="auth-title">Entre na sua <em>conta</em></h1>
        <p className="auth-lede">Continue acompanhando suas finanças.</p>

        <form onSubmit={handleSubmit} className="card" style={{ padding: 24 }}>
          <div className="field">
            <label>Email</label>
            <div className="auth-input-wrap">
              <span className="lead"><Mail size={15} /></span>
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@exemplo.com"
                autoFocus
              />
            </div>
          </div>

          <div className="field">
            <label>Senha</label>
            <div className="auth-input-wrap">
              <span className="lead"><Lock size={15} /></span>
              <input
                className="has-trail"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
              <button type="button" className="trail" onClick={() => setShowPassword((s) => !s)} aria-label={showPassword ? 'Esconder senha' : 'Mostrar senha'}>
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {error && <div className="auth-error" style={{ marginBottom: 16 }}>{error}</div>}

          <button type="submit" disabled={loading} className="btn-solid" style={{ width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {loading ? 'Entrando…' : <><span>Entrar</span><ArrowRight size={16} /></>}
          </button>
        </form>

        <p className="auth-alt">
          Ainda não tem conta? <a href="/signup">Criar conta</a>
        </p>
      </div>
    </div>
  )
}
