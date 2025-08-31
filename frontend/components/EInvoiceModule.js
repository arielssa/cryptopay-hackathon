import { useState } from 'react'

export default function EInvoiceModule() {
  const [invoiceId, setInvoiceId] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSend = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res = await fetch(`/api/einvoice/${invoiceId}/send`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      })
      if (!res.ok) throw new Error('Error al enviar e-invoice')
      const data = await res.json()
      setResult(data)
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }

  const handleRetry = async () => {
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res = await fetch(`/api/einvoice/${invoiceId}/retry`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      })
      if (!res.ok) throw new Error('Error al reintentar e-invoice')
      const data = await res.json()
      setResult(data)
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }

  const handleStatus = async () => {
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res = await fetch(`/api/einvoice/${invoiceId}/status`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      })
      if (!res.ok) throw new Error('Error al consultar estado')
      const data = await res.json()
      setResult(data)
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }

  const handleBatch = async () => {
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res = await fetch(`/api/einvoice/batch/process`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      })
      if (!res.ok) throw new Error('Error al procesar pendientes')
      const data = await res.json()
      setResult(data)
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }

  return (
    <div className="card" style={{ padding: 24, maxWidth: 400 }}>
      <h2>E-Invoice</h2>
      <form onSubmit={handleSend} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input type="text" placeholder="Invoice ID" value={invoiceId} onChange={e => setInvoiceId(e.target.value)} required />
        <button className="button" type="submit" disabled={loading}>Enviar e-invoice</button>
      </form>
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button className="button button-secondary" onClick={handleRetry} disabled={loading || !invoiceId}>Reintentar</button>
        <button className="button button-secondary" onClick={handleStatus} disabled={loading || !invoiceId}>Estado</button>
        <button className="button button-secondary" onClick={handleBatch} disabled={loading}>Procesar pendientes</button>
      </div>
      {loading && <p>Cargando...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {result && (
        <div style={{ marginTop: 16 }}>
          <pre style={{ fontSize: 13, background: '#f7f7f7', padding: 8, borderRadius: 6 }}>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  )
}
