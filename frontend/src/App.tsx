import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import { AuthProvider } from './context/AuthContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Layout } from './components/Layout';
import { HomePage } from './pages/Home';
import { LoginPage } from './pages/Login';
import { DashboardPage } from './pages/Dashboard';

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <Layout>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route 
                path="*" 
                element={
                  <div style={{ textAlign: 'center', padding: '2rem' }}>
                    <h2>404 - Page Not Found</h2>
                    <p>The page you are looking for does not exist.</p>
                  </div>
                } 
              />
            </Routes>
          </Layout>
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;