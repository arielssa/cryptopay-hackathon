import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { usePasskeySetup } from '../hooks/usePasskeySetup'

export default function SetupPasskey() {
  const [email, setEmail] = useState('')
  const [step, setStep] = useState('welcome') // welcome, registering, success, error
  const [error, setError] = useState('')
  const router = useRouter()
  const { registerPasskey, loading } = usePasskeySetup()

  useEffect(() => {
    // Get email from URL params
    if (router.query.email) {
      setEmail(router.query.email)
    }
  }, [router.query.email])

  const startPasskeyRegistration = async () => {
    if (!email) {
      toast.error('Email no encontrado')
      return
    }

    setStep('registering')
    setError('')

    try {
      await registerPasskey(email)
      setStep('success')
      toast.success('¡PassKey configurado exitosamente!')
    } catch (error) {
      console.error('PassKey setup error:', error)
      setError(error.message || 'Error configurando PassKey')
      setStep('error')
      toast.error(error.message || 'Error configurando PassKey')
    }
  }

  const renderWelcome = () => (
    <>
      <div className="logo-container">
        <div className="logo">🔐</div>
      </div>
      
      <h1 className="title slide-in">
        Configura tu PassKey
      </h1>
      
      <p className="subtitle slide-in">
        ¡Bienvenido! Tu cuenta ha sido creada exitosamente.<br/>
        Ahora configura tu PassKey para acceso seguro sin contraseñas.
      </p>

      <div className="form slide-in" style={{ animationDelay: '0.2s' }}>
        <div className="info-box">
          <p><strong>Email:</strong> {email}</p>
          <p className="micro-text">
            Tu PassKey se asociará a este email y te permitirá iniciar sesión de forma segura usando biometría o PIN.
          </p>
        </div>

        <button
          onClick={startPasskeyRegistration}
          className="button button-primary"
          disabled={loading}
        >
          {loading && <span className="loading"></span>}
          {loading ? 'Configurando...' : 'Configurar PassKey'}
        </button>
      </div>
    </>
  )

  const renderRegistering = () => (
    <>
      <div className="logo-container">
        <div className="logo animated">🔐</div>
      </div>
      
      <h1 className="title">
        Configurando PassKey...
      </h1>
      
      <p className="subtitle">
        Por favor, completa la autenticación en tu dispositivo
      </p>

      <div className="loading-container">
        <div className="spinner"></div>
        <p className="micro-text">
          Usa tu huella dactilar, reconocimiento facial, o PIN para crear tu PassKey
        </p>
      </div>
    </>
  )

  const renderSuccess = () => (
    <>
      <div className="logo-container">
        <div className="logo success">✅</div>
      </div>
      
      <h1 className="title slide-in">
        ¡PassKey Configurado!
      </h1>
      
      <p className="subtitle slide-in">
        Tu PassKey ha sido creado exitosamente. Ahora puedes acceder a tu cuenta de forma segura.
      </p>

      <div className="form slide-in" style={{ animationDelay: '0.2s' }}>
        <button
          onClick={() => router.push('/login')}
          className="button button-primary"
        >
          Ir a Iniciar Sesión
        </button>
      </div>
    </>
  )

  const renderError = () => (
    <>
      <div className="logo-container">
        <div className="logo error">❌</div>
      </div>
      
      <h1 className="title slide-in">
        Error configurando PassKey
      </h1>
      
      <p className="subtitle slide-in">
        {error || 'Ocurrió un error inesperado'}
      </p>

      <div className="form slide-in" style={{ animationDelay: '0.2s' }}>
        <button
          onClick={startPasskeyRegistration}
          className="button button-primary"
          disabled={loading}
        >
          Intentar de nuevo
        </button>
        
        <Link href="/login" className="button button-secondary">
          Ir a Iniciar Sesión
        </Link>
      </div>
    </>
  )

  return (
    <div className="container fade-in">
      {step === 'welcome' && renderWelcome()}
      {step === 'registering' && renderRegistering()}
      {step === 'success' && renderSuccess()}
      {step === 'error' && renderError()}
      
      <p className="micro-text slide-in" style={{ animationDelay: '0.4s' }}>
        ¿Problemas? <Link href="/login" style={{ color: 'var(--primary-color)', fontWeight: 500 }}>Ir a iniciar sesión</Link>
      </p>
    </div>
  )
}
