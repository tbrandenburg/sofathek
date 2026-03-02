import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Main application layout component
 * Provides the overall structure for the Netflix-like interface
 */
export function Layout({ children, className = '' }: LayoutProps) {
  return (
    <div className={`min-h-screen bg-gray-900 text-white ${className}`}>
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-red-600">Sofathek</h1>
            <span className="text-gray-400 text-sm">Family Media Center</span>
          </div>
          
          {/* Navigation could go here in the future */}
          <nav className="flex items-center space-x-4">
            <button className="text-gray-300 hover:text-white transition-colors">
              Library
            </button>
          </nav>
        </div>
      </header>

      {/* Main content area */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 border-t border-gray-700 px-6 py-4 text-center text-gray-400 text-sm">
        <div className="max-w-7xl mx-auto">
          Sofathek - Safe Family Entertainment
        </div>
      </footer>
    </div>
  );
}

/**
 * Content wrapper for consistent padding and max-width
 */
export function ContentContainer({ 
  children, 
  className = '' 
}: { 
  children: React.ReactNode; 
  className?: string; 
}) {
  return (
    <div className={`max-w-7xl mx-auto px-6 py-8 ${className}`}>
      {children}
    </div>
  );
}

/**
 * Page header with title and optional subtitle
 */
export function PageHeader({
  title,
  subtitle,
  actions,
  className = ''
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex items-start justify-between mb-8 ${className}`}>
      <div>
        <h2 className="text-3xl font-bold text-white mb-2">{title}</h2>
        {subtitle && (
          <p className="text-gray-400">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center space-x-4">
          {actions}
        </div>
      )}
    </div>
  );
}