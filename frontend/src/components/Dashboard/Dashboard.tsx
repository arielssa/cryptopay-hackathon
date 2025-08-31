import React, { useState, useEffect } from 'react';
import { invoicesService } from '../../services/invoices';
import { DashboardMetrics } from '../../types';

const Dashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    try {
      const data = await invoicesService.getDashboardMetrics();
      setMetrics(data);
    } catch (err: any) {
      setError('Failed to load dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="dashboard-loading">
      <div className="loading-spinner"></div>
      <p>Loading dashboard...</p>
    </div>
  );
  
  if (error) return (
    <div className="dashboard-error">
      <div className="error-icon">⚠️</div>
      <h3>Error Loading Dashboard</h3>
      <p>{error}</p>
      <button onClick={loadMetrics} className="btn-retry">Retry</button>
    </div>
  );

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>📊 Dashboard</h1>
        <p className="dashboard-subtitle">Overview of your business performance</p>
      </div>
      
      <div className="metrics-grid">
        <div className="metric-card metric-issued">
          <div className="metric-icon">📄</div>
          <div className="metric-content">
            <h3>Issued Invoices</h3>
            <div className="metric-value">{metrics?.issued || 0}</div>
            <div className="metric-label">Total issued</div>
          </div>
        </div>
        
        <div className="metric-card metric-paid">
          <div className="metric-icon">✅</div>
          <div className="metric-content">
            <h3>Paid Invoices</h3>
            <div className="metric-value">{metrics?.paid || 0}</div>
            <div className="metric-label">Successfully paid</div>
          </div>
        </div>
        
        <div className="metric-card metric-canceled">
          <div className="metric-icon">❌</div>
          <div className="metric-content">
            <h3>Canceled Invoices</h3>
            <div className="metric-value">{metrics?.canceled || 0}</div>
            <div className="metric-label">Cancelled by user</div>
          </div>
        </div>
        
        <div className="metric-card metric-expired">
          <div className="metric-icon">⏰</div>
          <div className="metric-content">
            <h3>Expired Invoices</h3>
            <div className="metric-value">{metrics?.expired || 0}</div>
            <div className="metric-label">Past due date</div>
          </div>
        </div>
        
        <div className="metric-card metric-revenue">
          <div className="metric-icon">💰</div>
          <div className="metric-content">
            <h3>Total Revenue (USDC)</h3>
            <div className="metric-value">${metrics?.total_usdc?.toFixed(2) || '0.00'}</div>
            <div className="metric-label">Crypto earnings</div>
          </div>
        </div>
      </div>
      
      <div className="dashboard-actions">
        <div className="action-buttons">
          <a href="/invoices/create" className="btn-primary btn-large">
            <span className="btn-icon">➕</span>
            Create New Invoice
          </a>
          <a href="/invoices" className="btn-secondary btn-large">
            <span className="btn-icon">📋</span>
            View All Invoices
          </a>
          <a href="/qr-generator" className="btn-secondary btn-large">
            <span className="btn-icon">🔲</span>
            QR Generator
          </a>
        </div>
      </div>

      <div className="dashboard-summary">
        <div className="summary-card">
          <h3>Quick Stats</h3>
          <div className="summary-stats">
            <div className="summary-stat">
              <span className="stat-label">Payment Rate:</span>
              <span className="stat-value">
                {metrics && metrics.issued > 0 
                  ? `${((metrics.paid / metrics.issued) * 100).toFixed(1)}%`
                  : '0%'
                }
              </span>
            </div>
            <div className="summary-stat">
              <span className="stat-label">Active Invoices:</span>
              <span className="stat-value">
                {(metrics?.issued || 0) - (metrics?.paid || 0) - (metrics?.canceled || 0)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
