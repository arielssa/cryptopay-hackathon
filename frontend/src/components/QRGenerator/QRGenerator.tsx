import React, { useState } from 'react';
import { qrService } from '../../services/qr';
import { QRRequest, QRResponse } from '../../types';

const QRGenerator: React.FC = () => {
  const [formData, setFormData] = useState<QRRequest>({
    to_address: '',
    amount: 0,
    gas_limit: 21000,
  });
  const [qrResult, setQrResult] = useState<QRResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await qrService.generateQR(formData);
      setQrResult(result);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to generate QR code');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'amount' || name === 'gas_limit' ? parseInt(value) : value,
    }));
  };

  return (
    <div className="qr-generator">
      <div className="page-header">
        <h1>QR Code Generator</h1>
        <p>Generate QR codes for Ethereum transactions (EIP-681 format)</p>
      </div>

      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleSubmit} className="qr-form">
        <div className="form-group">
          <label htmlFor="to_address">Recipient Address:</label>
          <input
            type="text"
            id="to_address"
            name="to_address"
            value={formData.to_address}
            onChange={handleChange}
            placeholder="0x..."
            required
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="amount">Amount (wei):</label>
          <input
            type="number"
            id="amount"
            name="amount"
            value={formData.amount}
            onChange={handleChange}
            min={0}
            required
            disabled={loading}
          />
          <small>Enter amount in wei (1 ETH = 10^18 wei)</small>
        </div>

        <div className="form-group">
          <label htmlFor="gas_limit">Gas Limit:</label>
          <input
            type="number"
            id="gas_limit"
            name="gas_limit"
            value={formData.gas_limit}
            onChange={handleChange}
            min={21000}
            disabled={loading}
          />
        </div>

        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Generating...' : 'Generate QR Code'}
        </button>
      </form>

      {qrResult && (
        <div className="qr-result">
          <h3>Generated QR Code</h3>

          <div className="qr-display">
            <img
              src={`data:image/png;base64,${qrResult.qr_base64}`}
              alt="QR Code"
              className="qr-image"
            />
          </div>

          <div className="uri-display">
            <h4>EIP-681 URI:</h4>
            <code className="uri-text">{qrResult.uri}</code>
            <button
              onClick={() => navigator.clipboard.writeText(qrResult.uri)}
              className="btn-secondary btn-small"
            >
              Copy URI
            </button>
          </div>

          <div className="qr-actions">
            <button
              onClick={() => {
                const link = document.createElement('a');
                link.href = `data:image/png;base64,${qrResult.qr_base64}`;
                link.download = 'qr-code.png';
                link.click();
              }}
              className="btn-secondary"
            >
              Download QR Code
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default QRGenerator;
