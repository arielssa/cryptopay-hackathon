import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '../contexts/AuthContext'
import InvoicesModule from '../components/InvoicesModule'
import QRModule from '../components/QRModule'
import UserOperationModule from '../components/UserOperationModule'
import EInvoiceModule from '../components/EInvoiceModule'

export default function Dashboard() {
  const [mounted, setMounted] = useState(false)
  const { user, loading, logout } = useAuth()
  const router = useRouter()
  const [selected, setSelected] = useState('dashboard')

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  const handleLogout = () => {
    logout()
    router.push('/')
  }

  const modules = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'auth', label: 'Autenticación' },
    { key: 'qr', label: 'Generar QR' },
    { key: 'user', label: 'Operaciones de usuario' },
    { key: 'einvoice', label: 'E-Invoice' }
  ]

  const renderContent = () => {
    switch (selected) {
      case 'dashboard':
        return (
          <>
            <h1 className="title">Dashboard</h1>
            <p className="subtitle">¡Bienvenido, {user.email}!</p>
            <div style={{ marginTop: '2rem' }}>
              <p>Tu cuenta está configurada y lista para usar.</p>
              <button
                onClick={handleLogout}
                className="button button-secondary"
                style={{ marginTop: '2rem' }}
              >
                Cerrar sesión
              </button>
            </div>
          </>
        )
      case 'auth':
        return <InvoicesModule user={user} />
      case 'qr':
        return <QRModule />
      case 'user':
        return <UserOperationModule />
      case 'einvoice':
        return <EInvoiceModule />
      default:
        return null
    }
  }

  if (!mounted || loading) {
    return (
      <div className="container">
        <div className="loading"></div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f7f9fb' }}>
      <aside style={{
        width: '220px',
        background: '#fff',
        boxShadow: '2px 0 8px rgba(0,0,0,0.04)',
        display: 'flex',
        flexDirection: 'column',
        padding: '2rem 1rem',
        gap: '1rem',
        borderRadius: '0 16px 16px 0',
        margin: '2rem 0',
        height: 'fit-content'
      }}>
        {modules.map(m => (
          <button
            key={m.key}
            onClick={() => setSelected(m.key)}
            style={{
              background: selected === m.key ? '#e6f0ff' : 'transparent',
              color: selected === m.key ? '#0056d6' : '#222',
              border: 'none',
              borderRadius: '8px',
              padding: '0.75rem 1rem',
              fontWeight: 'bold',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'background 0.2s'
            }}
          >
            {m.label}
          </button>
        ))}
      </aside>
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="card" style={{ minWidth: 350, maxWidth: 480 }}>
          {renderContent()}
        </div>
      </main>
    </div>
  )
}
