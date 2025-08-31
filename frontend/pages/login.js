import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { useWebAuthn } from '../hooks/useWebAuthn'
import { useAuth } from '../contexts/AuthContext'

export default function Login() {
  const [email, setEmail] = useState('')
  const [isValid, setIsValid] = useState(false)
  const [step, setStep] = useState('email') // email, passkey, success
  const router = useRouter()
  const { login: webAuthnLogin, loading } = useWebAuthn()
  const { login: authLogin } = useAuth()

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return re.test(email)
  }

  useEffect(() => {
    setIsValid(validateEmail(email))
  }, [email])

  const handleEmailSubmit = async (e) => {
    e.preventDefault()
    if (!isValid) return

    setStep('passkey')
  }

  const handlePasskeyLogin = async () => {
    try {
      const result = await webAuthnLogin(email)
      
      // Store authentication data
      authLogin(
        { email, id: result.user_id },
        result.access_token
      )

      setStep('success')
      
      // Redirect to dashboard after success animation
      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)
      
    } catch (error) {
      console.error('Login error:', error)
      setStep('email')
    }
  }

  const handleBackToEmail = () => {
    setStep('email')
  }

  if (step === 'success') {
    return (
      <div className="container fade-in">
        <div className="logo-container">
          <div className="logo">CP</div>
        </div>
        
        <div className="success-icon">
          ✓
        </div>
        
        <h1 className="title slide-in">
          ¡Bienvenido de vuelta!
        </h1>
        
        <p className="subtitle slide-in">
          Has iniciado sesión exitosamente
        </p>
        
        <p className="micro-text slide-in" style={{ animationDelay: '0.2s' }}>
          Redirigiendo a tu dashboard...
        </p>
      </div>
    )
  }

  if (step === 'passkey') {
    return (
      <div className="container fade-in">
        <div className="logo-container">
          <div className="logo">CP</div>
        </div>
        
        <div className={`biometric-icon ${loading ? 'pulse' : ''}`}>
          {loading ? '🔄' : '🔐'}
        </div>
        
        <h1 className="title slide-in">
          {loading ? 'Autenticando...' : 'Usa tu Passkey'}
        </h1>
        
        <p className="subtitle slide-in">
          {loading 
            ? 'Verifica tu identidad usando tu método biométrico'
            : `Inicia sesión con tu huella dactilar, Face ID o PIN para ${email}`
          }
        </p>
        
        {!loading && (
          <div className="slide-in" style={{ animationDelay: '0.2s' }}>
            <button
              onClick={handlePasskeyLogin}
              className="button button-primary"
            >
              Autenticar con Passkey
            </button>
          </div>
        )}
        
        <p className="micro-text slide-in" style={{ animationDelay: '0.4s' }}>
          <button
            onClick={handleBackToEmail}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--primary-color)',
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
          >
            ← Usar otro email
          </button>
        </p>
      </div>
    )
  }

  return (
    <div className="container fade-in">
      <div className="logo-container">
        <div className="logo">CP</div>
      </div>
      
      <div className="biometric-icon">
        🔐
      </div>
      
      <h1 className="title slide-in">
        Iniciar sesión
      </h1>
      
      <p className="subtitle slide-in">
        Ingresa tu email para acceder con tu Passkey
      </p>
      
      <form onSubmit={handleEmailSubmit} className="form slide-in" style={{ animationDelay: '0.2s' }}>
        <div className="input-container">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
            className={`input ${email ? (isValid ? 'input-valid' : 'input-invalid') : ''}`}
            autoFocus
            required
          />
          {email && (
            <span className="input-icon">
              {isValid ? '✓' : '✗'}
            </span>
          )}
        </div>
        
        {email && !isValid && (
          <div className="error-message">
            Por favor ingresa un email válido
          </div>
        )}
        
        <button
          type="submit"
          className="button button-primary"
          disabled={!isValid}
        >
          Continuar
        </button>
      </form>
      
      <p className="micro-text slide-in" style={{ animationDelay: '0.4s' }}>
        ¿No tienes cuenta? <Link href="/register" style={{ color: 'var(--primary-color)', fontWeight: 500 }}>Crear cuenta</Link>
      </p>
    </div>
  )
}
