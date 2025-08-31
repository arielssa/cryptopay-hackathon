import React, { useState, useEffect } from 'react';
import { einvoiceService } from '../../services/einvoice';
import { EInvoiceStatus } from '../../types';

const EInvoice: React.FC = () => {
  const [invoiceId, setInvoiceId] = useState<string>('');
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Extract invoiceId from URL path
    const pathParts = window.location.pathname.split('/');
    const extractedInvoiceId = pathParts[pathParts.length - 2]; // Get the invoice ID before 'einvoice'
    setInvoiceId(extractedInvoiceId);
    
    if (extractedInvoiceId) {
      loadStatus(extractedInvoiceId);
    }
  }, []);

  const loadStatus = async (id: string) => {
    try {
      const data = await einvoiceService.getEInvoiceStatus(id);
      setStatus(data);
    } catch (err: any) {
      setError('Failed to load e-invoice status');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitEInvoice = async () => {
    setSubmitting(true);
    try {
      await einvoiceService.submitEInvoice(invoiceId);
      loadStatus(invoiceId); // Reload status
    } catch (err: any) {
      setError('Failed to submit e-invoice');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetryEInvoice = async () => {
    setSubmitting(true);
    try {
      await einvoiceService.retryEInvoice(invoiceId);
      loadStatus(invoiceId); // Reload status
    } catch (err: any) {
      setError('Failed to retry e-invoice');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadXML = async () => {
    try {
      const blob = await einvoiceService.downloadXML(invoiceId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${invoiceId}.xml`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert('Failed to download XML');
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const blob = await einvoiceService.downloadPDF(invoiceId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${invoiceId}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert('Failed to download PDF');
    }
  };

  if (loading) return <div className="loading">Loading e-invoice status...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="einvoice">
      <div className="page-header">
        <h1>E-Invoice Management</h1>
        <a href="/invoices" className="btn-secondary">Back to Invoices</a>
      </div>

      {status && (
        <div className="einvoice-status">
          <div className="status-card">
            <h3>Current Status</h3>
            <div className={`status-badge status-${status.status.toLowerCase()}`}>
              {status.status}
            </div>
            
            {status.einvoice_number && (
              <div className="einvoice-number">
                <strong>E-Invoice Number:</strong> {status.einvoice_number}
              </div>
            )}
            
            {status.einvoice_url && (
              <div className="einvoice-url">
                <strong>E-Invoice URL:</strong> 
                <a href={status.einvoice_url} target="_blank" rel="noopener noreferrer">
                  {status.einvoice_url}
                </a>
              </div>
            )}
            
            {status.error_message && (
              <div className="error-message">
                <strong>Error:</strong> {status.error_message}
              </div>
            )}
          </div>

          <div className="einvoice-actions">
            {status.status === EInvoiceStatus.PENDING && (
              <button 
                onClick={handleSubmitEInvoice}
                className="btn-primary"
                disabled={submitting}
              >
                {submitting ? 'Submitting...' : 'Submit E-Invoice'}
              </button>
            )}
            
            {status.status === EInvoiceStatus.FAILED && (
              <button 
                onClick={handleRetryEInvoice}
                className="btn-secondary"
                disabled={submitting}
              >
                {submitting ? 'Retrying...' : 'Retry E-Invoice'}
              </button>
            )}
            
            {status.status === EInvoiceStatus.SENT && (
              <div className="download-actions">
                <button 
                  onClick={handleDownloadXML}
                  className="btn-secondary"
                >
                  Download XML
                </button>
                
                <button 
                  onClick={handleDownloadPDF}
                  className="btn-secondary"
                >
                  Download PDF
                </button>
              </div>
            )}
          </div>

          {status.submission_history && status.submission_history.length > 0 && (
            <div className="submission-history">
              <h4>Submission History</h4>
              <div className="history-list">
                {status.submission_history.map((entry: any, index: number) => (
                  <div key={index} className="history-entry">
                    <div className="entry-date">
                      {new Date(entry.timestamp).toLocaleString()}
                    </div>
                    <div className="entry-status">{entry.status}</div>
                    <div className="entry-message">{entry.message}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EInvoice;
