import React from 'react';
import { ThemeProvider } from "@/components/theme-provider"
import { ModeToggle } from "@/components/mode-toggle"
import { ConnectionStatus } from "@/components/ConnectionStatus"

interface LayoutProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Main application layout component
 * Provides the overall structure for the Netflix-like interface with theme support
 */
export function Layout({ children, className = '' }: LayoutProps) {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <div className={`min-h-screen bg-background text-foreground ${className}`}>
        {/* Header */}
        <header className="bg-card border-b border-border px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-red-600">Sofathek</h1>
              <span className="text-muted-foreground text-sm">Family Media Center</span>
            </div>
            
            {/* Navigation with Theme Toggle */}
            <nav className="flex items-center space-x-4">
              <button className="text-muted-foreground hover:text-foreground transition-colors">
                Library
              </button>
              <ModeToggle />
            </nav>
          </div>
        </header>
        
        {/* Connection Status Banner */}
        <ConnectionStatus />

        {/* Main content area */}
        <main className="flex-1">
          {children}
        </main>

        {/* Footer */}
        <footer className="bg-card border-t border-border px-6 py-4 text-center text-muted-foreground text-sm">
          <div className="max-w-7xl mx-auto">
            Sofathek - Safe Family Entertainment
          </div>
        </footer>
      </div>
    </ThemeProvider>
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
        <h2 className="text-3xl font-bold text-foreground mb-2">{title}</h2>
        {subtitle && (
          <p className="text-muted-foreground">{subtitle}</p>
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