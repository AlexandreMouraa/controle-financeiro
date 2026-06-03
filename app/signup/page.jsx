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
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) { router.replace('/'); return }
      setChecking(false)
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

        <p className="eyebrow" style={{ marginTop: 4 }}>Cadastro</p>
        <h1 className="auth-title">Crie sua <em>conta</em></h1>
        <p className="auth-lede">Comece a controlar suas finanças agora.</p>

        {success ? (
          <div className="card" style={{ padding: 24, textAlign: 'center' }}>
            <p style={{ fontSize: 26 }}>📬</p>
            <p style={{ fontWeight: 600, margin: '8px 0', color: 'var(--ink)' }}>Confirme seu email</p>
            <p style={{ fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.5 }}>
              Enviamos um link de confirmação para <strong style={{ color: 'var(--ink-soft)' }}>{email}</strong>. Acesse seu email e clique no link pra ativar sua conta.
            </p>
            <a href="/login" className="linkbtn" style={{ display: 'inline-block', marginTop: 14 }}>Voltar para o login</a>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="card" style={{ padding: 24 }}>
            <div className="field">
              <label>Email</label>
              <div className="auth-input-wrap">
                <span className="lead"><Mail size={15} /></span>
                <input type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@exemplo.com" autoFocus />
              </div>
            </div>

            <div className="field">
              <label>Senha</label>
              <div className="auth-input-wrap">
                <span className="lead"><Lock size={15} /></span>
                <input className="has-trail" type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
                <button type="button" className="trail" onClick={() => setShowPassword((s) => !s)} aria-label={showPassword ? 'Esconder senha' : 'Mostrar senha'}>
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div className="field">
              <label>Confirmar senha</label>
              <div className="auth-input-wrap">
                <span className="lead"><Lock size={15} /></span>
                <input className="has-trail" type={showConfirm ? 'text' : 'password'} autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repita a senha" />
                <button type="button" className="trail" onClick={() => setShowConfirm((s) => !s)} aria-label={showConfirm ? 'Esconder senha' : 'Mostrar senha'}>
                  {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {error && <div className="auth-error" style={{ marginBottom: 16 }}>{error}</div>}

            <button type="submit" disabled={loading} className="btn-solid" style={{ width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              {loading ? 'Criando conta…' : <><span>Criar conta</span><ArrowRight size={16} /></>}
            </button>
          </form>
        )}

        <p className="auth-alt">
          Já tem conta? <a href="/login">Entrar</a>
        </p>
      </div>
    </div>
  )
}
