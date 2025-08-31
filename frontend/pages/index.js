import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { useAuth } from '../contexts/AuthContext'

export default function Home() {
  const [mounted, setMounted] = useState(false)
  const router = useRouter()
  const { user, loading } = useAuth()

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard')
    }
  }, [user, loading, router])

  if (!mounted) {
    return null
  }

  if (loading) {
    return (
      <div className="container">
        <div className="loading"></div>
      </div>
    )
  }

  return (
    <div className="container fade-in">
      <div className="logo-container">
        <div className="logo">CP</div>
      </div>
      
      <h1 className="title slide-in">
        Bienvenido a CryptoPay
      </h1>
      
      <p className="subtitle slide-in">
        La plataforma más segura y rápida para gestionar tus pagos con USDC en la red Base
      </p>
      
      <div className="slide-in" style={{ animationDelay: '0.2s' }}>
        <Link href="/register" className="button button-primary">
          Crear cuenta
        </Link>
        <Link href="/login" className="button button-secondary">
          Ya tengo cuenta
        </Link>
      </div>
      
      <p className="micro-text slide-in" style={{ animationDelay: '0.4s' }}>
        Powered by Base Network • Secured by Passkey
      </p>
    </div>
  )
}
