import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../themes/ThemeProvider';
import { Theme, getThemesByCategory } from '../themes/config';
import './ThemeSelector.css';

interface ThemeSelectorProps {
  showCategories?: boolean;
  showPreview?: boolean;
  compact?: boolean;
  className?: string;
}

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({
  showCategories = true,
  showPreview = true,
  compact = false,
  className = '',
}) => {
  const {
    currentTheme,
    setTheme,
    availableThemes,
    previewTheme,
    setPreviewTheme,
    resetToCurrentTheme,
  } = useTheme();

  const [isOpen, setIsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<
    'streaming' | 'custom' | 'all'
  >('all');
  const selectorRef = useRef<HTMLDivElement>(null);
  const previewTimeoutRef = useRef<number | null>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        selectorRef.current &&
        !selectorRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        resetToCurrentTheme();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [resetToCurrentTheme]);

  // Filter themes based on category
  const filteredThemes =
    selectedCategory === 'all'
      ? availableThemes
      : getThemesByCategory(selectedCategory);

  const handleThemeSelect = (theme: Theme) => {
    setTheme(theme.id);
    setIsOpen(false);
    resetToCurrentTheme();
  };

  const handleThemePreview = (theme: Theme) => {
    if (!showPreview) return;

    // Clear existing timeout
    if (previewTimeoutRef.current) {
      window.clearTimeout(previewTimeoutRef.current);
    }

    setPreviewTheme(theme);

    // Auto-reset preview after 3 seconds
    previewTimeoutRef.current = window.setTimeout(() => {
      resetToCurrentTheme();
    }, 3000);
  };

  const handleThemeHoverEnd = () => {
    if (!showPreview) return;

    // Clear timeout and reset preview
    if (previewTimeoutRef.current) {
      window.clearTimeout(previewTimeoutRef.current);
    }

    resetToCurrentTheme();
  };

  const displayTheme = previewTheme || currentTheme;

  return (
    <div
      ref={selectorRef}
      className={`theme-selector ${compact ? 'compact' : ''} ${className}`}
    >
      <button
        className={`theme-trigger ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Select theme"
        aria-expanded={isOpen}
      >
        <div className="theme-preview-indicator">
          <div
            className="color-dot primary"
            style={{ backgroundColor: displayTheme.colors.primary }}
          />
          <div
            className="color-dot accent"
            style={{ backgroundColor: displayTheme.colors.accentColor }}
          />
          <div
            className="color-dot background"
            style={{ backgroundColor: displayTheme.colors.backgroundSecondary }}
          />
        </div>

        {!compact && (
          <div className="theme-info">
            <span className="theme-name">{displayTheme.name}</span>
            {previewTheme && <span className="preview-label">Preview</span>}
          </div>
        )}

        <svg
          className="dropdown-icon"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <polyline points="6,9 12,15 18,9" />
        </svg>
      </button>

      {isOpen && (
        <div className="theme-dropdown">
          {showCategories && (
            <div className="category-tabs">
              <button
                className={selectedCategory === 'all' ? 'active' : ''}
                onClick={() => setSelectedCategory('all')}
              >
                All
              </button>
              <button
                className={selectedCategory === 'streaming' ? 'active' : ''}
                onClick={() => setSelectedCategory('streaming')}
              >
                Streaming
              </button>
              <button
                className={selectedCategory === 'custom' ? 'active' : ''}
                onClick={() => setSelectedCategory('custom')}
              >
                Custom
              </button>
            </div>
          )}

          <div className="theme-grid">
            {filteredThemes.map(theme => (
              <div
                key={theme.id}
                className={`theme-option ${theme.id === currentTheme.id ? 'active' : ''}`}
                onClick={() => handleThemeSelect(theme)}
                onMouseEnter={() => handleThemePreview(theme)}
                onMouseLeave={handleThemeHoverEnd}
                role="button"
                tabIndex={0}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleThemeSelect(theme);
                  }
                }}
              >
                <div className="theme-colors">
                  <div
                    className="color-sample primary"
                    style={{ backgroundColor: theme.colors.primary }}
                  />
                  <div
                    className="color-sample accent"
                    style={{ backgroundColor: theme.colors.accentColor }}
                  />
                  <div
                    className="color-sample background"
                    style={{
                      backgroundColor: theme.colors.backgroundSecondary,
                    }}
                  />
                </div>

                <div className="theme-details">
                  <div className="theme-title">
                    {theme.name}
                    {theme.id === currentTheme.id && (
                      <svg
                        className="check-icon"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <polyline points="20,6 9,17 4,12" />
                      </svg>
                    )}
                  </div>
                  <div className="theme-description">{theme.description}</div>
                  <div className="theme-inspiration">
                    <span className="category-badge">{theme.category}</span>
                    <span className="inspiration">{theme.inspiration}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {showPreview && previewTheme && (
            <div className="preview-notice">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="m9 12 2 2 4-4" />
              </svg>
              Previewing {previewTheme.name} - Click to apply permanently
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ThemeSelector;
