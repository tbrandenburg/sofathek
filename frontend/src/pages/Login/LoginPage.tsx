import React from 'react';
import { Navigate } from 'react-router-dom';

import { LoginForm } from '../../components/LoginForm';
import { useAuth } from '../../context/AuthContext';

export function LoginPage() {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleLoginSuccess = () => {
    // Navigation will happen automatically due to auth state change
  };

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h1>Sign In</h1>
        <p style={{ color: '#6c757d' }}>
          Access your account to explore the dashboard and API integration.
        </p>
      </div>
      
      <LoginForm onSuccess={handleLoginSuccess} />
    </div>
  );
}