import React, { useState, useEffect } from 'react';
import { invoicesService } from '../../services/invoices';
import { einvoiceService } from '../../services/einvoice';
import { Invoice, InvoiceStatus, EInvoiceStatus } from '../../types';

const InvoiceList: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
    try {
      const data = await invoicesService.getInvoices();
      setInvoices(data);
    } catch (err: any) {
      setError('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  const handleEmitInvoice = async (id: string) => {
    try {
      await invoicesService.emitInvoice(id);
      loadInvoices(); // Reload list
    } catch (err: any) {
      alert('Failed to emit invoice');
    }
  };

  const handleCancelInvoice = async (id: string) => {
    if (window.confirm('Are you sure you want to cancel this invoice?')) {
      try {
        await invoicesService.cancelInvoice(id);
        loadInvoices(); // Reload list
      } catch (err: any) {
        alert('Failed to cancel invoice');
      }
    }
  };

  const handleSubmitEInvoice = async (id: string) => {
    try {
      await einvoiceService.submitEInvoice(id);
      loadInvoices(); // Reload list
    } catch (err: any) {
      alert('Failed to submit e-invoice');
    }
  };

  const getStatusColor = (status: InvoiceStatus) => {
    switch (status) {
      case InvoiceStatus.DRAFT: return 'status-draft';
      case InvoiceStatus.ISSUED: return 'status-issued';
      case InvoiceStatus.PAID: return 'status-paid';
      case InvoiceStatus.CANCELED: return 'status-canceled';
      case InvoiceStatus.EXPIRED: return 'status-expired';
      default: return '';
    }
  };

  const getEInvoiceStatusColor = (status: EInvoiceStatus | undefined) => {
    if (!status) return 'status-pending';
    switch (status) {
      case EInvoiceStatus.PENDING: return 'status-pending';
      case EInvoiceStatus.SENT: return 'status-sent';
      case EInvoiceStatus.FAILED: return 'status-failed';
      default: return 'status-pending';
    }
  };

  const getStatusIcon = (status: InvoiceStatus) => {
    switch (status) {
      case InvoiceStatus.DRAFT: return '📝';
      case InvoiceStatus.ISSUED: return '📤';
      case InvoiceStatus.PAID: return '✅';
      case InvoiceStatus.CANCELED: return '❌';
      case InvoiceStatus.EXPIRED: return '⏰';
      default: return '📄';
    }
  };

  const getEInvoiceStatusIcon = (status: EInvoiceStatus | undefined) => {
    if (!status) return '⏳';
    switch (status) {
      case EInvoiceStatus.PENDING: return '⏳';
      case EInvoiceStatus.SENT: return '📨';
      case EInvoiceStatus.FAILED: return '⚠️';
      default: return '⏳';
    }
  };

  if (loading) return (
    <div className="invoice-list-loading">
      <div className="loading-spinner"></div>
      <p>Loading invoices...</p>
    </div>
  );
  
  if (error) return (
    <div className="invoice-list-error">
      <div className="error-icon">⚠️</div>
      <h3>Error Loading Invoices</h3>
      <p>{error}</p>
      <button onClick={loadInvoices} className="btn-retry">Retry</button>
    </div>
  );

  return (
    <div className="invoice-list">
      <div className="page-header">
        <div className="header-content">
          <h1>📋 Invoices</h1>
          <p className="header-subtitle">Manage your business invoices</p>
        </div>
        <a href="/invoices/create" className="btn-primary btn-large">
          <span className="btn-icon">➕</span>
          Create New Invoice
        </a>
      </div>

      {invoices.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📄</div>
          <h3>No Invoices Found</h3>
          <p>Create your first invoice to get started!</p>
          <a href="/invoices/create" className="btn-primary">Create Invoice</a>
        </div>
      ) : (
        <div className="invoice-grid">
          {invoices.map((invoice) => (
            <div key={invoice.id} className="invoice-card">
              <div className="invoice-header">
                <div className="invoice-id">
                  <span className="id-label">Invoice ID:</span>
                  <span className="id-value">{invoice.invoice_id || invoice.id.substring(0, 8)}</span>
                </div>
                <div className="invoice-status">
                  <span className={`status-badge ${getStatusColor(invoice.status)}`}>
                    {getStatusIcon(invoice.status)} {invoice.status}
                  </span>
                </div>
              </div>
              
              <div className="invoice-details">
                <div className="detail-row">
                  <span className="detail-label">Customer:</span>
                  <span className="detail-value">{invoice.customer_email}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Total:</span>
                  <span className="detail-value total-amount">${invoice.total.toFixed(2)}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">USDC:</span>
                  <span className="detail-value usdc-amount">{invoice.total_usdc} USDC</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Created:</span>
                  <span className="detail-value">{new Date(invoice.created_at).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="einvoice-status">
                <span className="einvoice-label">E-Invoice:</span>
                <span className={`einvoice-badge ${getEInvoiceStatusColor(invoice.einvoice_status)}`}>
                  {getEInvoiceStatusIcon(invoice.einvoice_status)} {invoice.einvoice_status || 'PENDING'}
                </span>
              </div>

              <div className="invoice-actions">
                {invoice.status === InvoiceStatus.DRAFT && (
                  <button 
                    onClick={() => handleEmitInvoice(invoice.id)}
                    className="btn-primary btn-small"
                  >
                    📤 Emit
                  </button>
                )}
                
                {invoice.status === InvoiceStatus.ISSUED && (
                  <>
                    <button 
                      onClick={() => handleCancelInvoice(invoice.id)}
                      className="btn-danger btn-small"
                    >
                      ❌ Cancel
                    </button>
                    
                    {(!invoice.einvoice_status || invoice.einvoice_status === EInvoiceStatus.PENDING) && (
                      <button 
                        onClick={() => handleSubmitEInvoice(invoice.id)}
                        className="btn-secondary btn-small"
                      >
                        📨 Submit E-Invoice
                      </button>
                    )}
                  </>
                )}
                
                {invoice.checkout_url && (
                  <a 
                    href={invoice.checkout_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-link btn-small"
                  >
                    🔗 Payment Link
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default InvoiceList;
