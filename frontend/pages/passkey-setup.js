import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { useWebAuthn } from '../hooks/useWebAuthn'

export default function PasskeySetup() {
  const [email, setEmail] = useState('')
  const [isSetupComplete, setIsSetupComplete] = useState(false)
  const [step, setStep] = useState('intro') // intro, setup, success
  const router = useRouter()
  const { register, loading } = useWebAuthn()

  useEffect(() => {
    const emailParam = router.query.email
    if (emailParam) {
      setEmail(emailParam)
    }
  }, [router.query.email])

  const handleSetupPasskey = async () => {
    if (!email) {
      toast.error('Email no encontrado')
      return
    }

    setStep('setup')

    try {
      await register(email)
      setStep('success')
      setIsSetupComplete(true)
    } catch (error) {
      console.error('Passkey setup error:', error)
      setStep('intro')
      // Error toast is handled in the hook
    }
  }

  const handleContinue = () => {
    router.push('/login')
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
          ¡Passkey configurado!
        </h1>
        
        <p className="subtitle slide-in">
          Tu método de autenticación biométrica ha sido configurado exitosamente
        </p>
        
        <div className="slide-in" style={{ animationDelay: '0.2s' }}>
          <button
            onClick={handleContinue}
            className="button button-primary"
          >
            Continuar
          </button>
        </div>
        
        <p className="micro-text slide-in" style={{ animationDelay: '0.4s' }}>
          Ahora puedes acceder de forma segura usando tu huella dactilar, Face ID o PIN
        </p>
      </div>
    )
  }

  return (
    <div className="container fade-in">
      <div className="logo-container">
        <div className="logo">CP</div>
      </div>
      
      <div className={`biometric-icon ${step === 'setup' ? 'pulse' : ''}`}>
        {step === 'setup' ? '🔄' : '🔐'}
      </div>
      
      <h1 className="title slide-in">
        {step === 'setup' ? 'Configurando...' : 'Configura tu Passkey'}
      </h1>
      
      <p className="subtitle slide-in">
        {step === 'setup' 
          ? 'Sigue las instrucciones de tu dispositivo para completar la configuración'
          : 'Usa tu huella dactilar, Face ID o PIN para acceder de forma segura'
        }
      </p>
      
      {step === 'intro' && (
        <>
          <div className="slide-in" style={{ animationDelay: '0.2s' }}>
            <button
              onClick={handleSetupPasskey}
              className="button button-primary"
              disabled={loading}
            >
              {loading && <span className="loading"></span>}
              Configurar Passkey
            </button>
          </div>
          
          <p className="micro-text slide-in" style={{ animationDelay: '0.4s' }}>
            Este método es más seguro que las contraseñas tradicionales y funciona únicamente en tu dispositivo
          </p>
        </>
      )}
      
      {step === 'setup' && (
        <p className="micro-text slide-in" style={{ animationDelay: '0.4s' }}>
          Si no aparece ningún cuadro de diálogo, verifica que tu dispositivo sea compatible con Passkeys
        </p>
      )}
      
      <p className="micro-text">
        <Link href="/verify-email" style={{ color: 'var(--primary-color)' }}>
          ← Volver
        </Link>
      </p>
    </div>
  )
}
