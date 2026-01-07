import React, { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { useAuth } from '../../context/AuthContext';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { user, logout, isAuthenticated } = useAuth();
  const location = useLocation();

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{
        backgroundColor: '#343a40',
        color: 'white',
        padding: '1rem',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <nav style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          maxWidth: '1200px',
          margin: '0 auto'
        }}>
          <div>
            <Link 
              to="/" 
              style={{ 
                color: 'white', 
                textDecoration: 'none',
                fontSize: '1.5rem',
                fontWeight: 'bold'
              }}
            >
              Golden Template
            </Link>
          </div>
          
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <Link
              to="/"
              style={{
                color: location.pathname === '/' ? '#ffc107' : 'white',
                textDecoration: 'none',
                padding: '0.5rem 1rem'
              }}
            >
              Home
            </Link>
            
            {isAuthenticated ? (
              <>
                <Link
                  to="/dashboard"
                  style={{
                    color: location.pathname === '/dashboard' ? '#ffc107' : 'white',
                    textDecoration: 'none',
                    padding: '0.5rem 1rem'
                  }}
                >
                  Dashboard
                </Link>
                <span style={{ color: '#adb5bd' }}>
                  Welcome, {user?.username}
                </span>
                <button
                  onClick={logout}
                  style={{
                    backgroundColor: '#dc3545',
                    color: 'white',
                    border: 'none',
                    padding: '0.5rem 1rem',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Logout
                </button>
              </>
            ) : (
              <Link
                to="/login"
                style={{
                  color: location.pathname === '/login' ? '#ffc107' : 'white',
                  textDecoration: 'none',
                  padding: '0.5rem 1rem'
                }}
              >
                Login
              </Link>
            )}
          </div>
        </nav>
      </header>

      <main style={{
        flex: 1,
        padding: '2rem',
        maxWidth: '1200px',
        margin: '0 auto',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        {children}
      </main>

      <footer style={{
        backgroundColor: '#f8f9fa',
        padding: '1rem',
        textAlign: 'center',
        borderTop: '1px solid #dee2e6',
        color: '#6c757d'
      }}>
        <p>&copy; 2024 Golden Template. Built with React + Express + TypeScript.</p>
      </footer>
    </div>
  );
}