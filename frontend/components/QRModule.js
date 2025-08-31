import { useState } from 'react'

export default function QRModule() {
  const [toAddress, setToAddress] = useState('')
  const [amount, setAmount] = useState('')
  const [gasLimit, setGasLimit] = useState('21000')
  const [qr, setQr] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleGenerate = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setQr(null)
    try {
      const res = await fetch('/api/qr-generator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to_address: toAddress, amount: Number(amount), gas_limit: Number(gasLimit) })
      })
      if (!res.ok) throw new Error('Error al generar QR')
      const data = await res.json()
      setQr(data)
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }

  return (
    <div className="card" style={{ padding: 24, maxWidth: 400 }}>
      <h2>Generar QR</h2>
      <form onSubmit={handleGenerate} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input type="text" placeholder="Dirección" value={toAddress} onChange={e => setToAddress(e.target.value)} required />
        <input type="number" placeholder="Monto" value={amount} onChange={e => setAmount(e.target.value)} required />
        <input type="number" placeholder="Gas Limit" value={gasLimit} onChange={e => setGasLimit(e.target.value)} required />
        <button className="button" type="submit" disabled={loading}>Generar</button>
      </form>
      {loading && <p>Cargando...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {qr && (
        <div style={{ marginTop: 16 }}>
          <p><strong>URI:</strong> {qr.uri}</p>
          <img src={`data:image/png;base64,${qr.qr_base64}`} alt="QR" style={{ width: 180, height: 180 }} />
        </div>
      )}
    </div>
  )
}
