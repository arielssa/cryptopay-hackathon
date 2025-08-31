import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { useEmailAuth } from '../hooks/useEmailAuth'

export default function VerifyEmail() {
  const [email, setEmail] = useState('')
  const [countdown, setCountdown] = useState(30)
  const [canResend, setCanResend] = useState(false)
  const router = useRouter()
  const { sendMagicLink, loading } = useEmailAuth()

  useEffect(() => {
    const emailParam = router.query.email
    if (emailParam) {
      setEmail(emailParam)
    }
  }, [router.query.email])

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    } else {
      setCanResend(true)
    }
  }, [countdown])

  const handleResendEmail = async () => {
    try {
      await sendMagicLink(email)
      setCountdown(30)
      setCanResend(false)
    } catch (error) {
      // Error toast is handled in the hook
    }
  }

  const handleContinue = () => {
    router.push(`/passkey-setup?email=${encodeURIComponent(email)}`)
  }

  return (
    <div className="container fade-in">
      <div className="logo-container">
        <div className="logo">CP</div>
      </div>
      
      <div className="email-icon animated">
        📧
      </div>
      
      <h1 className="title slide-in">
        Revisa tu email
      </h1>
      
      <p className="subtitle slide-in">
        Te hemos enviado un enlace de verificación a<br />
        <strong>{email}</strong>
      </p>
      
      <div className="slide-in" style={{ animationDelay: '0.2s' }}>
        <button
          onClick={handleContinue}
          className="button button-primary"
        >
          Ya verifiqué mi email
        </button>
      </div>
      
      <p className="micro-text slide-in" style={{ animationDelay: '0.4s' }}>
        ¿No recibiste el email?{' '}
        {canResend ? (
          <button
            onClick={handleResendEmail}
            disabled={loading}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--primary-color)',
              fontWeight: 500,
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
          >
            {loading ? (
              <>
                <span className="loading" style={{ marginRight: '0.25rem' }}></span>
                Reenviando...
              </>
            ) : (
              'Reenviar'
            )}
          </button>
        ) : (
          <>
            Puedes solicitar otro en{' '}
            <span className="countdown">{countdown}</span>
          </>
        )}
      </p>
      
      <p className="micro-text">
        <Link href="/register" style={{ color: 'var(--primary-color)' }}>
          ← Volver al registro
        </Link>
      </p>
    </div>
  )
}
