import React from 'react';
import { useAuth } from './hooks/useAuth';
import Login from './components/Authentication/Login';
import Register from './components/Authentication/Register';
import Dashboard from './components/Dashboard/Dashboard';
import InvoiceList from './components/Invoices/InvoiceList';
import CreateInvoice from './components/Invoices/CreateInvoice';
import QRGenerator from './components/QRGenerator/QRGenerator';
import PaymentPage from './components/Payments/PaymentPage';
import EInvoice from './components/EInvoice/EInvoice';
import Navbar from './components/Common/Navbar';
import './App.css';

const App: React.FC = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div className="loading-app">Loading...</div>;
  }

  // Simple routing based on window.location.pathname
  const getCurrentPath = () => {
    if (typeof window !== 'undefined') {
      return window.location.pathname;
    }
    return '/';
  };

  const currentPath = getCurrentPath();

  // Render different components based on current path
  const renderContent = () => {
    switch (currentPath) {
      case '/login':
        return !isAuthenticated ? <Login /> : <Dashboard />;
      case '/register':
        return !isAuthenticated ? <Register /> : <Dashboard />;
      case '/dashboard':
        return isAuthenticated ? <Dashboard /> : <Login />;
      case '/invoices':
        return isAuthenticated ? <InvoiceList /> : <Login />;
      case '/invoices/create':
        return isAuthenticated ? <CreateInvoice /> : <Login />;
      case '/qr-generator':
        return isAuthenticated ? <QRGenerator /> : <Login />;
      default:
        // Check if it's a payment route
        if (currentPath.startsWith('/pay/')) {
          return <PaymentPage />;
        }
        // Check if it's an e-invoice route
        if (currentPath.includes('/einvoice')) {
          return isAuthenticated ? <EInvoice /> : <Login />;
        }
        // Default to dashboard if authenticated, login if not
        return isAuthenticated ? <Dashboard /> : <Login />;
    }
  };

  return (
    <div className="App">
      {isAuthenticated && <Navbar />}
      
      <div className={`main-content ${isAuthenticated ? 'with-navbar' : ''}`}>
        {renderContent()}
      </div>
    </div>
  );
};

export default App;
