import React, { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import ThemeSelector from './ThemeSelector';
import './Layout.css';

interface LayoutProps {
  children: ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Home' },
    { path: '/library', label: 'Library' },
    { path: '/downloads', label: 'Downloads' },
    { path: '/upload', label: 'Upload' },
    { path: '/admin', label: 'Admin' },
  ];

  return (
    <div className="layout">
      <header className="layout-header">
        <div className="header-content">
          <Link to="/" className="logo">
            <h1>Sofathek</h1>
          </Link>

          <nav className="main-nav">
            {navItems.map(item => (
              <Link
                key={item.path}
                to={item.path}
                className={`nav-link ${location.pathname === item.path ? 'active' : ''}`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="header-actions">
            <ThemeSelector compact={true} />
          </div>
        </div>
      </header>

      <main className="layout-main">{children}</main>

      <footer className="layout-footer">
        <div className="footer-content">
          <p>&copy; 2024 Sofathek - Self-Hosted Media Center</p>
        </div>
      </footer>
    </div>
  );
};
