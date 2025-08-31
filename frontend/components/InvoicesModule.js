import { useState } from 'react'

export default function InvoicesModule({ user }) {
  const [tab, setTab] = useState('list')
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Basic fetch for invoices
  const fetchInvoices = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/invoices', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      })
      if (!res.ok) throw new Error('Error al obtener facturas')
      const data = await res.json()
      setInvoices(data)
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }

  // Fetch invoices on tab change
  React.useEffect(() => {
    if (tab === 'list') fetchInvoices()
  }, [tab])

  return (
    <div>
      <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
        <button className={tab === 'list' ? 'button' : 'button button-secondary'} onClick={() => setTab('list')}>Lista</button>
        <button className={tab === 'create' ? 'button' : 'button button-secondary'} onClick={() => setTab('create')}>Crear</button>
      </div>
      {tab === 'list' && (
        <div>
          <h2>Facturas</h2>
          {loading && <p>Cargando...</p>}
          {error && <p style={{ color: 'red' }}>{error}</p>}
          <ul style={{ padding: 0 }}>
            {invoices.map(inv => (
              <li key={inv.id} style={{ listStyle: 'none', marginBottom: 16 }}>
                <div className="card" style={{ padding: 16 }}>
                  <strong>{inv.customer_email}</strong><br />
                  Total: ${inv.total} USDC<br />
                  Estado: {inv.status}<br />
                  <span style={{ fontSize: 12, color: '#888' }}>Creada: {new Date(inv.created_at).toLocaleString()}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
      {tab === 'create' && (
        <InvoiceCreateForm onCreated={() => setTab('list')} />
      )}
    </div>
  )
}
