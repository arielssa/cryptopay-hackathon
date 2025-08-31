import React from 'react';
import { useAuth } from '../../hooks/useAuth';

const Navbar: React.FC = () => {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
  };

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <a href="/dashboard">CryptoPay</a>
      </div>
      
      <div className="navbar-menu">
        <a href="/dashboard" className="navbar-item">Dashboard</a>
        <a href="/invoices" className="navbar-item">Invoices</a>
        <a href="/qr-generator" className="navbar-item">QR Generator</a>
        
        <div className="navbar-user">
          <span className="user-email">{user}</span>
          <button onClick={handleLogout} className="btn-logout">
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
