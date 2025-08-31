import React, { useState, useEffect } from 'react';
import { paymentsService } from '../../services/payments';
import { PublicInvoice, PaymentRequest } from '../../types';

interface PaymentPageProps {}

const PaymentPage: React.FC<PaymentPageProps> = () => {
  const [invoiceId, setInvoiceId] = useState<string>('');
  const [invoice, setInvoice] = useState<PublicInvoice | null>(null);
  const [txHash, setTxHash] = useState('');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Extract invoiceId from URL path
    const pathParts = window.location.pathname.split('/');
    const extractedInvoiceId = pathParts[pathParts.length - 1];
    setInvoiceId(extractedInvoiceId);
    
    if (extractedInvoiceId) {
      loadInvoice(extractedInvoiceId);
    }
  }, []);

  const loadInvoice = async (id: string) => {
    try {
      const data = await paymentsService.getPublicInvoice(id);
      setInvoice(data);
    } catch (err: any) {
      setError('Invoice not found or not available for payment');
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);
    setError('');

    try {
      const paymentData: PaymentRequest = {
        tx_hash: txHash
      };
      
      await paymentsService.confirmPayment(invoiceId, paymentData);
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Payment processing failed');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <div className="loading">Loading invoice...</div>;
  if (error && !invoice) return <div className="error">{error}</div>;

  if (success) {
    return (
      <div className="payment-page">
        <div className="success-message">
          <h2>Payment Submitted!</h2>
          <p>Your payment has been submitted and is being processed.</p>
          <p>Transaction Hash: {txHash}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="payment-page">
      <div className="invoice-details">
        <h1>Pay Invoice</h1>
        
        {invoice && (
          <div className="invoice-info">
            <div className="merchant-info">
              <h3>Merchant: {invoice.merchant}</h3>
            </div>
            
            <div className="invoice-summary">
              <div className="summary-row">
                <span>Subtotal:</span>
                <span>${invoice.subtotal.toFixed(2)}</span>
              </div>
              <div className="summary-row">
                <span>Tax:</span>
                <span>${invoice.tax_amount.toFixed(2)}</span>
              </div>
              <div className="summary-row total">
                <span>Total:</span>
                <span>${invoice.total.toFixed(2)}</span>
              </div>
              <div className="summary-row crypto">
                <span>Amount in USDC:</span>
                <span>{invoice.total_usdc} USDC</span>
              </div>
            </div>

            <div className="invoice-items">
              <h4>Items:</h4>
              {invoice.items.map((item, index: number) => (
                <div key={index} className="item">
                  <span>{item.name}</span>
                  <span>{item.qty} × ${item.unit_price} = ${(item.qty * item.unit_price).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {invoice?.qr_url && (
          <div className="qr-section">
            <h3>Scan to Pay</h3>
            <div className="qr-display">
              <p>Scan this QR code with your crypto wallet:</p>
              <div className="qr-placeholder">
                {/* QR code would be displayed here */}
                <p>QR Code: {invoice.qr_url}</p>
              </div>
            </div>
          </div>
        )}

        <div className="manual-payment">
          <h3>Manual Payment Confirmation</h3>
          <p>If you've already sent the payment, please provide the transaction details:</p>
          
          {error && <div className="error-message">{error}</div>}
          
          <form onSubmit={handlePayment}>
            <div className="form-group">
              <label htmlFor="txHash">Transaction Hash:</label>
              <input
                type="text"
                id="txHash"
                value={txHash}
                onChange={(e) => setTxHash(e.target.value)}
                placeholder="0x..."
                required
                disabled={processing}
              />
            </div>
            
            <button 
              type="submit" 
              className="btn-primary"
              disabled={processing}
            >
              {processing ? 'Processing...' : 'Confirm Payment'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PaymentPage;
