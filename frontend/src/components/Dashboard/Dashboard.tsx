import React, { useState, useEffect } from 'react';

import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { User, HealthCheck } from '../../types';

export function Dashboard() {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [health, setHealth] = useState<HealthCheck | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError('');

        const [usersResponse, healthResponse] = await Promise.all([
          api.getUsers(),
          api.getHealth()
        ]);

        if (usersResponse.success && usersResponse.data) {
          setUsers(usersResponse.data);
        }

        if (healthResponse.success && healthResponse.data) {
          setHealth(healthResponse.data);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <div>Loading dashboard data...</div>
      </div>
    );
  }

  return (
    <div>
      <h1>Welcome to the Dashboard</h1>
      <p>Hello, <strong>{user?.username}</strong>! You are successfully authenticated.</p>

      {error && (
        <div style={{
          padding: '1rem',
          marginBottom: '1rem',
          backgroundColor: '#f8d7da',
          color: '#721c24',
          border: '1px solid #f5c6cb',
          borderRadius: '4px'
        }}>
          Error: {error}
        </div>
      )}

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '2rem',
        marginTop: '2rem'
      }}>
        {/* System Health Card */}
        <div style={{
          padding: '1.5rem',
          border: '1px solid #dee2e6',
          borderRadius: '8px',
          backgroundColor: 'white',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <h3>System Health</h3>
          {health ? (
            <div>
              <div style={{ marginBottom: '0.5rem' }}>
                Status: <span style={{ 
                  color: health.status === 'ok' ? '#28a745' : '#dc3545',
                  fontWeight: 'bold'
                }}>
                  {health.status.toUpperCase()}
                </span>
              </div>
              <div style={{ marginBottom: '0.5rem' }}>
                Uptime: {Math.round(health.uptime / 1000)}s
              </div>
              <div style={{ marginBottom: '0.5rem' }}>
                Version: {health.version}
              </div>
              <div style={{ fontSize: '0.875rem', color: '#6c757d' }}>
                Last updated: {new Date(health.timestamp).toLocaleString()}
              </div>
            </div>
          ) : (
            <div style={{ color: '#6c757d' }}>Health data unavailable</div>
          )}
        </div>

        {/* Users Card */}
        <div style={{
          padding: '1.5rem',
          border: '1px solid #dee2e6',
          borderRadius: '8px',
          backgroundColor: 'white',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <h3>Users ({users.length})</h3>
          {users.length > 0 ? (
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {users.map((user) => (
                <div 
                  key={user.id}
                  style={{
                    padding: '0.75rem',
                    marginBottom: '0.5rem',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '4px',
                    border: '1px solid #e9ecef'
                  }}
                >
                  <div style={{ fontWeight: 'bold' }}>{user.username}</div>
                  <div style={{ fontSize: '0.875rem', color: '#6c757d' }}>
                    {user.email} • {user.role}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: '#6c757d' }}>No users found</div>
          )}
        </div>

        {/* User Profile Card */}
        <div style={{
          padding: '1.5rem',
          border: '1px solid #dee2e6',
          borderRadius: '8px',
          backgroundColor: 'white',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <h3>Your Profile</h3>
          {user && (
            <div>
              <div style={{ marginBottom: '0.5rem' }}>
                <strong>Username:</strong> {user.username}
              </div>
              <div style={{ marginBottom: '0.5rem' }}>
                <strong>Email:</strong> {user.email}
              </div>
              <div style={{ marginBottom: '0.5rem' }}>
                <strong>Role:</strong> <span style={{
                  padding: '0.25rem 0.5rem',
                  backgroundColor: user.role === 'admin' ? '#d4edda' : '#d1ecf1',
                  color: user.role === 'admin' ? '#155724' : '#0c5460',
                  borderRadius: '4px',
                  fontSize: '0.875rem'
                }}>
                  {user.role.toUpperCase()}
                </span>
              </div>
              <div style={{ fontSize: '0.875rem', color: '#6c757d' }}>
                Member since: {new Date(user.createdAt).toLocaleDateString()}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}