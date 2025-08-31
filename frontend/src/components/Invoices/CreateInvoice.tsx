import React, { useState } from 'react';
import { invoicesService } from '../../services/invoices';
import { CreateInvoiceRequest, InvoiceItem } from '../../types';

const CreateInvoice: React.FC = () => {
  const [customerEmail, setCustomerEmail] = useState('');
  const [taxRate, setTaxRate] = useState(0.12); // Default 12%
  const [items, setItems] = useState<InvoiceItem[]>([
    { name: '', qty: 1, unit_price: 0 }
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const addItem = () => {
    setItems([...items, { name: '', qty: 1, unit_price: 0 }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => sum + (item.qty * item.unit_price), 0);
  };

  const calculateTax = () => {
    return calculateSubtotal() * taxRate;
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const request: CreateInvoiceRequest = {
        customer_email: customerEmail,
        items: items,
        tax: taxRate
      };

      await invoicesService.createInvoice(request);
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create invoice');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="create-invoice">
        <div className="success-message">
          <h2>Invoice Created Successfully!</h2>
          <p>Your invoice has been created and is now in DRAFT status.</p>
          <a href="/invoices" className="btn-primary">View All Invoices</a>
        </div>
      </div>
    );
  }

  return (
    <div className="create-invoice">
      <div className="page-header">
        <h1>Create New Invoice</h1>
        <a href="/invoices" className="btn-secondary">Back to Invoices</a>
      </div>

      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleSubmit} className="invoice-form">
        <div className="form-section">
          <h3>Customer Information</h3>
          <div className="form-group">
            <label htmlFor="customerEmail">Customer Email:</label>
            <input
              type="email"
              id="customerEmail"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>
        </div>

        <div className="form-section">
          <h3>Invoice Items</h3>
          {items.map((item, index) => (
            <div key={index} className="item-row">
              <div className="form-group">
                <label>Name:</label>
                <input
                  type="text"
                  value={item.name}
                  onChange={(e) => updateItem(index, 'name', e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <div className="form-group">
                <label>Quantity:</label>
                <input
                  type="number"
                  min="1"
                  value={item.qty}
                  onChange={(e) => updateItem(index, 'qty', parseInt(e.target.value))}
                  required
                  disabled={loading}
                />
              </div>
              <div className="form-group">
                <label>Unit Price ($):</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={item.unit_price}
                  onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value))}
                  required
                  disabled={loading}
                />
              </div>
              <div className="form-group">
                <label>Total:</label>
                <div className="calculated-field">
                  ${(item.qty * item.unit_price).toFixed(2)}
                </div>
              </div>
              {items.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  className="btn-danger btn-small"
                  disabled={loading}
                >
                  Remove
                </button>
              )}
            </div>
          ))}
          
          <button
            type="button"
            onClick={addItem}
            className="btn-secondary"
            disabled={loading}
          >
            Add Item
          </button>
        </div>

        <div className="form-section">
          <h3>Tax Information</h3>
          <div className="form-group">
            <label htmlFor="taxRate">Tax Rate:</label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="1"
              id="taxRate"
              value={taxRate}
              onChange={(e) => setTaxRate(parseFloat(e.target.value))}
              required
              disabled={loading}
            />
            <small>Enter as decimal (e.g., 0.12 for 12%)</small>
          </div>
        </div>

        <div className="invoice-summary">
          <div className="summary-row">
            <span>Subtotal:</span>
            <span>${calculateSubtotal().toFixed(2)}</span>
          </div>
          <div className="summary-row">
            <span>Tax ({(taxRate * 100).toFixed(1)}%):</span>
            <span>${calculateTax().toFixed(2)}</span>
          </div>
          <div className="summary-row total">
            <span>Total:</span>
            <span>${calculateTotal().toFixed(2)}</span>
          </div>
        </div>

        <div className="form-actions">
          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Create Invoice'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateInvoice;
