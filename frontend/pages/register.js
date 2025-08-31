import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { useEmailAuth } from '../hooks/useEmailAuth'

export default function Register() {
  const [formData, setFormData] = useState({
    name: '',
    country: '',
    city: '',
    postal_code: '',
    address: '',
    email: '',
    tax_number: ''
  })
  const [currentStep, setCurrentStep] = useState(1)
  const [showEmailIcon, setShowEmailIcon] = useState(false)
  const router = useRouter()
  const { sendMagicLink, loading } = useEmailAuth()

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return re.test(email)
  }

  const validateStep1 = () => {
    return validateEmail(formData.email)
  }

  const validateStep2 = () => {
    return formData.name.trim() !== '' && 
           formData.country.trim() !== '' && 
           formData.city.trim() !== ''
  }

  const validateStep3 = () => {
    return formData.address.trim() !== '' && 
           formData.postal_code.trim() !== '' && 
           formData.tax_number.trim() !== ''
  }

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleNextStep = () => {
    if (currentStep === 1 && validateStep1()) {
      setCurrentStep(2)
    } else if (currentStep === 2 && validateStep2()) {
      setCurrentStep(3)
    }
  }

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateStep3()) return

    setShowEmailIcon(true)

    try {
      await sendMagicLink(formData)
      
      // Redirect to email verification
      router.push(`/verify-email?email=${encodeURIComponent(formData.email)}`)
      
    } catch (error) {
      setShowEmailIcon(false)
      // Error toast is handled in the hook
    }
  }

  const renderStep1 = () => (
    <>
      <h1 className="title slide-in">
        Información de contacto
      </h1>
      
      <p className="subtitle slide-in">
        Ingresa tu email para comenzar el registro
      </p>
      
      <div className="form slide-in" style={{ animationDelay: '0.2s' }}>
        <div className="input-container">
          <input
            type="email"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            placeholder="tu@email.com"
            className={`input ${formData.email ? (validateEmail(formData.email) ? 'input-valid' : 'input-invalid') : ''}`}
            autoFocus
            required
          />
          {formData.email && (
            <span className="input-icon">
              {validateEmail(formData.email) ? '✓' : '✗'}
            </span>
          )}
        </div>
        
        {formData.email && !validateEmail(formData.email) && (
          <div className="error-message">
            Por favor ingresa un email válido
          </div>
        )}
        
        <button
          type="button"
          onClick={handleNextStep}
          className="button button-primary"
          disabled={!validateStep1()}
        >
          Continuar
        </button>
      </div>
    </>
  )

  const renderStep2 = () => (
    <>
      <h1 className="title slide-in">
        Información de la empresa
      </h1>
      
      <p className="subtitle slide-in">
        Completa los datos de tu empresa
      </p>
      
      <div className="form slide-in" style={{ animationDelay: '0.2s' }}>
        <div className="input-container">
          <input
            type="text"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            placeholder="Nombre de la empresa"
            className="input"
            autoFocus
            required
          />
        </div>
        
        <div className="input-container">
          <input
            type="text"
            value={formData.country}
            onChange={(e) => handleInputChange('country', e.target.value)}
            placeholder="País (ej: ECU)"
            className="input"
            maxLength="3"
            required
          />
        </div>
        
        <div className="input-container">
          <input
            type="text"
            value={formData.city}
            onChange={(e) => handleInputChange('city', e.target.value)}
            placeholder="Ciudad"
            className="input"
            required
          />
        </div>
        
        <div className="button-group">
          <button
            type="button"
            onClick={handlePrevStep}
            className="button button-secondary"
          >
            Atrás
          </button>
          <button
            type="button"
            onClick={handleNextStep}
            className="button button-primary"
            disabled={!validateStep2()}
          >
            Continuar
          </button>
        </div>
      </div>
    </>
  )

  const renderStep3 = () => (
    <>
      <h1 className="title slide-in">
        Información adicional
      </h1>
      
      <p className="subtitle slide-in">
        Completa los datos restantes
      </p>
      
      <form onSubmit={handleSubmit} className="form slide-in" style={{ animationDelay: '0.2s' }}>
        <div className="input-container">
          <input
            type="text"
            value={formData.address}
            onChange={(e) => handleInputChange('address', e.target.value)}
            placeholder="Dirección"
            className="input"
            autoFocus
            required
          />
        </div>
        
        <div className="input-container">
          <input
            type="text"
            value={formData.postal_code}
            onChange={(e) => handleInputChange('postal_code', e.target.value)}
            placeholder="Código postal"
            className="input"
            required
          />
        </div>
        
        <div className="input-container">
          <input
            type="text"
            value={formData.tax_number}
            onChange={(e) => handleInputChange('tax_number', e.target.value)}
            placeholder="Número de identificación fiscal"
            className="input"
            required
          />
        </div>
        
        <div className="button-group">
          <button
            type="button"
            onClick={handlePrevStep}
            className="button button-secondary"
          >
            Atrás
          </button>
          <button
            type="submit"
            className="button button-primary"
            disabled={!validateStep3() || loading}
          >
            {loading && <span className="loading"></span>}
            {loading ? 'Enviando...' : 'Enviar Magic Link'}
          </button>
        </div>
      </form>
    </>
  )

  return (
    <div className="container fade-in">
      <div className="logo-container">
        <div className="logo">CP</div>
      </div>
      
      {showEmailIcon && (
        <div className="email-icon animated">
          📧
        </div>
      )}
      
      {/* Progress indicator */}
      <div className="progress-indicator">
        {[1, 2, 3].map((step) => (
          <div
            key={step}
            className={`progress-dot ${currentStep >= step ? 'active' : ''}`}
          />
        ))}
      </div>
      
      {currentStep === 1 && renderStep1()}
      {currentStep === 2 && renderStep2()}
      {currentStep === 3 && renderStep3()}
      
      <p className="micro-text slide-in" style={{ animationDelay: '0.4s' }}>
        ¿Ya tienes cuenta? <Link href="/login" style={{ color: 'var(--primary-color)', fontWeight: 500 }}>Inicia sesión</Link>
      </p>
    </div>
  )
}
