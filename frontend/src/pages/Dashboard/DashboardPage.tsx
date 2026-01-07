import React from 'react';
import { Navigate } from 'react-router-dom';

import { Dashboard } from '../../components/Dashboard';
import { useAuth } from '../../context/AuthContext';

export function DashboardPage() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <div>Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Dashboard />;
}