import React from 'react';
import { Navigate } from 'react-router-dom';

import { LoginForm } from '../../components/LoginForm';
import { useAuth } from '../../context/AuthContext';

export function LoginPage() {
  const { isAuthenticated, login } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div
      style={{
        maxWidth: '400px',
        margin: '2rem auto',
        padding: '2rem',
        background: 'var(--background-secondary)',
        borderRadius: 'var(--border-radius)',
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h1>Sign In</h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Access your account to explore the dashboard and API integration.
        </p>
      </div>

      <LoginForm onLogin={login} />
    </div>
  );
}
