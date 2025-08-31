import { useState } from 'react'

export default function UserOperationModule() {
  const [sender, setSender] = useState('')
  const [target, setTarget] = useState('')
  const [data, setData] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSend = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res = await fetch('/api/user-operation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sender, target, data })
      })
      if (!res.ok) throw new Error('Error al enviar UserOperation')
      const response = await res.json()
      setResult(response)
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }

  return (
    <div className="card" style={{ padding: 24, maxWidth: 400 }}>
      <h2>Operaciones de usuario</h2>
      <form onSubmit={handleSend} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input type="text" placeholder="Sender" value={sender} onChange={e => setSender(e.target.value)} required />
        <input type="text" placeholder="Target" value={target} onChange={e => setTarget(e.target.value)} required />
        <input type="text" placeholder="Data (hex)" value={data} onChange={e => setData(e.target.value)} required />
        <button className="button" type="submit" disabled={loading}>Enviar</button>
      </form>
      {loading && <p>Cargando...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {result && (
        <div style={{ marginTop: 16 }}>
          <p><strong>Status:</strong> {result.status}</p>
          <p><strong>Tx Hash:</strong> {result.tx_hash}</p>
        </div>
      )}
    </div>
  )
}
