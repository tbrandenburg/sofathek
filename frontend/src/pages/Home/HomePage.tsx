import React from 'react';
import { Link } from 'react-router-dom';

import { useAuth } from '../../context/AuthContext';

export function HomePage() {
  const { isAuthenticated, user } = useAuth();

  return (
    <div style={{ textAlign: 'center' }}>
      <h1 style={{ 
        fontSize: '3rem',
        marginBottom: '1rem',
        color: '#343a40'
      }}>
        🏆 Golden Template Repository
      </h1>
      
      <p style={{
        fontSize: '1.25rem',
        color: '#6c757d',
        marginBottom: '2rem',
        maxWidth: '600px',
        margin: '0 auto 2rem'
      }}>
        A state-of-the-art Node.js full-stack template with React frontend, 
        Express backend, comprehensive testing, and Docker deployment.
      </p>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '2rem',
        marginTop: '3rem'
      }}>
        {/* Features */}
        <div style={{
          padding: '2rem',
          border: '1px solid #dee2e6',
          borderRadius: '8px',
          backgroundColor: 'white',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ color: '#007bff', marginBottom: '1rem' }}>
            ⚡ Modern Tech Stack
          </h3>
          <ul style={{ textAlign: 'left', lineHeight: '1.6' }}>
            <li>React 18 + TypeScript</li>
            <li>Express.js + Node.js</li>
            <li>Vite build system</li>
            <li>Docker containerization</li>
            <li>Jest + Cypress testing</li>
          </ul>
        </div>

        <div style={{
          padding: '2rem',
          border: '1px solid #dee2e6',
          borderRadius: '8px',
          backgroundColor: 'white',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ color: '#28a745', marginBottom: '1rem' }}>
            🛡️ Quality Assurance
          </h3>
          <ul style={{ textAlign: 'left', lineHeight: '1.6' }}>
            <li>ESLint + Prettier</li>
            <li>Pre-commit hooks</li>
            <li>TypeScript strict mode</li>
            <li>Test coverage reporting</li>
            <li>Error boundaries</li>
          </ul>
        </div>

        <div style={{
          padding: '2rem',
          border: '1px solid #dee2e6',
          borderRadius: '8px',
          backgroundColor: 'white',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ color: '#ffc107', marginBottom: '1rem' }}>
            🚀 Developer Experience
          </h3>
          <ul style={{ textAlign: 'left', lineHeight: '1.6' }}>
            <li>Hot module replacement</li>
            <li>Automated workflows</li>
            <li>VS Code integration</li>
            <li>Comprehensive docs</li>
            <li>Make commands</li>
          </ul>
        </div>
      </div>

      {/* Call to action */}
      <div style={{
        marginTop: '3rem',
        padding: '2rem',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px'
      }}>
        {isAuthenticated ? (
          <div>
            <h2>Welcome back, {user?.username}! 👋</h2>
            <p style={{ marginBottom: '1.5rem' }}>
              You are successfully authenticated. Explore the dashboard to see API integration in action.
            </p>
            <Link
              to="/dashboard"
              style={{
                display: 'inline-block',
                padding: '1rem 2rem',
                backgroundColor: '#007bff',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '6px',
                fontSize: '1.1rem',
                fontWeight: 'bold'
              }}
            >
              Go to Dashboard →
            </Link>
          </div>
        ) : (
          <div>
            <h2>Ready to explore? 🎯</h2>
            <p style={{ marginBottom: '1.5rem' }}>
              Try the authentication system and see the full-stack integration in action.
            </p>
            <Link
              to="/login"
              style={{
                display: 'inline-block',
                padding: '1rem 2rem',
                backgroundColor: '#28a745',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '6px',
                fontSize: '1.1rem',
                fontWeight: 'bold'
              }}
            >
              Try Demo Login →
            </Link>
          </div>
        )}
      </div>

      {/* Quick start */}
      <div style={{
        marginTop: '3rem',
        padding: '2rem',
        backgroundColor: '#343a40',
        color: 'white',
        borderRadius: '8px',
        textAlign: 'left'
      }}>
        <h3 style={{ color: 'white', textAlign: 'center' }}>Quick Start 🚀</h3>
        <pre style={{
          backgroundColor: '#495057',
          padding: '1rem',
          borderRadius: '4px',
          overflow: 'auto',
          fontSize: '0.9rem'
        }}>
{`# Clone and setup
git clone <repository-url>
cd golden-template-repo

# One command setup
make setup

# Start development
make dev

# Run tests
make test

# Build for production
make build
make docker-prod`}
        </pre>
      </div>
    </div>
  );
}