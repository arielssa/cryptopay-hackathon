import { useState } from 'react'

export default function InvoiceCreateForm({ onCreated }) {
  const [customerEmail, setCustomerEmail] = useState('')
  const [items, setItems] = useState([{ desc: '', qty: 1, unit_price: 0 }])
  const [tax, setTax] = useState(0.12)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleItemChange = (i, field, value) => {
    const newItems = [...items]
    newItems[i][field] = field === 'qty' || field === 'unit_price' ? Number(value) : value
    setItems(newItems)
  }

  const addItem = () => setItems([...items, { desc: '', qty: 1, unit_price: 0 }])
  const removeItem = i => setItems(items.filter((_, idx) => idx !== i))

  const handleSubmit = async e => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess(false)
    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          customer_email: customerEmail,
          items: items.map(it => ({ desc: it.desc, qty: it.qty, unit_price: it.unit_price })),
          tax
        })
      })
      if (!res.ok) throw new Error('Error al crear factura')
      setSuccess(true)
      setCustomerEmail('')
      setItems([{ desc: '', qty: 1, unit_price: 0 }])
      setTax(0.12)
      if (onCreated) onCreated()
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }

  return (
    <div className="card" style={{ padding: 24, maxWidth: 400 }}>
      <h2>Crear factura</h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input type="email" placeholder="Email del cliente" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} required />
        <div>
          <strong>Ítems</strong>
          {items.map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <input type="text" placeholder="Descripción" value={item.desc} onChange={e => handleItemChange(i, 'desc', e.target.value)} required style={{ flex: 2 }} />
              <input type="number" min={1} placeholder="Cantidad" value={item.qty} onChange={e => handleItemChange(i, 'qty', e.target.value)} required style={{ width: 70 }} />
              <input type="number" min={0} step={0.01} placeholder="Precio" value={item.unit_price} onChange={e => handleItemChange(i, 'unit_price', e.target.value)} required style={{ width: 90 }} />
              {items.length > 1 && <button type="button" onClick={() => removeItem(i)} style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer' }}>✕</button>}
            </div>
          ))}
          <button type="button" onClick={addItem} className="button button-secondary" style={{ marginTop: 4 }}>Agregar ítem</button>
        </div>
        <input type="number" min={0} max={1} step={0.01} placeholder="Tasa de impuesto" value={tax} onChange={e => setTax(Number(e.target.value))} required />
        <button className="button" type="submit" disabled={loading}>Crear factura</button>
      </form>
      {loading && <p>Cargando...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {success && <p style={{ color: 'green' }}>Factura creada correctamente</p>}
    </div>
  )
}