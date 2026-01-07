import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './themes/ThemeProvider';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Layout } from './components/Layout';
import { HomePage } from './pages/Home';
import { LoginPage } from './pages/Login';
import { DashboardPage } from './pages/Dashboard';
// Sofathek Media Center Pages
import { LibraryPage } from './pages/Library';
import { VideoPlayerPage } from './pages/VideoPlayer';
import { DownloadsPage } from './pages/Downloads';
import { UploadPage } from './pages/Upload';
import { AdminPage } from './pages/Admin';
import { ThemesPage } from './pages/Themes';
import './styles/globals.css';

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <Router>
            <Layout>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                {/* Sofathek Media Center Routes */}
                <Route path="/library" element={<LibraryPage />} />
                <Route path="/watch/:videoId" element={<VideoPlayerPage />} />
                <Route path="/downloads" element={<DownloadsPage />} />
                <Route path="/upload" element={<UploadPage />} />
                <Route path="/admin" element={<AdminPage />} />
                <Route path="/themes" element={<ThemesPage />} />
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
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
