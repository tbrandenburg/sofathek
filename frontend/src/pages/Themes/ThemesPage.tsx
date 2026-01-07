import React from 'react';
import { useTheme } from '../../themes';
import {
  ThemeSelector,
  VideoCard,
  SearchBar,
  CategoryFilter,
} from '../../components';
import './ThemesPage.css';

// Mock video data for demonstration
const mockVideo = {
  id: 'demo-video',
  title: 'Sofathek Demo Video',
  description:
    'This is a sample video to showcase the theme system and component styling.',
  duration: 180,
  thumbnail: undefined,
  category: 'Demo',
  resolution: '1080p',
  codec: 'H.264',
  bitrate: 5000,
  fileSize: 52428800, // 50MB
  dateAdded: new Date().toISOString(),
  tags: ['demo', 'showcase', 'theme'],
  chapters: [],
  subtitles: [],
  accessibility: {
    hasClosedCaptions: false,
    hasAudioDescription: false,
  },
};

const mockCategories = ['Demo', 'Movies', 'TV Shows', 'Documentaries', 'Music'];

export function ThemesPage() {
  const {
    currentTheme,
    availableThemes,
    setPreviewTheme,
    resetToCurrentTheme,
  } = useTheme();

  const handleSearch = (query: string) => {
    console.log('Demo search:', query);
  };

  const handleCategoryChange = (category: string | undefined) => {
    console.log('Demo category change:', category);
  };

  const handleVideoClick = () => {
    console.log('Demo video click');
  };

  return (
    <div className="themes-page">
      <div className="themes-container">
        {/* Header */}
        <div className="themes-header">
          <h1>Theme Showcase</h1>
          <p>
            Experience Sofathek with 10 beautifully crafted themes inspired by
            popular streaming platforms. Hover over theme cards to preview, or
            use the theme selector in the header.
          </p>
        </div>

        {/* Current Theme Info */}
        <div className="current-theme-info">
          <div className="theme-card active">
            <div className="theme-preview">
              <div className="color-palette">
                <div
                  className="color-swatch primary"
                  style={{ backgroundColor: currentTheme.colors.primary }}
                />
                <div
                  className="color-swatch accent"
                  style={{ backgroundColor: currentTheme.colors.accentColor }}
                />
                <div
                  className="color-swatch background"
                  style={{
                    backgroundColor: currentTheme.colors.backgroundSecondary,
                  }}
                />
                <div
                  className="color-swatch text"
                  style={{ backgroundColor: currentTheme.colors.textPrimary }}
                />
              </div>
            </div>
            <div className="theme-info">
              <h2>{currentTheme.name}</h2>
              <p>{currentTheme.description}</p>
              <div className="theme-meta">
                <span className="category">{currentTheme.category}</span>
                <span className="inspiration">
                  Inspired by {currentTheme.inspiration}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Component Showcase */}
        <div className="component-showcase">
          <h2>Component Preview</h2>
          <p>See how components look in the current theme:</p>

          <div className="showcase-grid">
            {/* Search & Filter Row */}
            <div className="showcase-section">
              <h3>Search & Filters</h3>
              <div className="showcase-row">
                <SearchBar onSearch={handleSearch} />
                <CategoryFilter
                  categories={mockCategories}
                  onCategoryChange={handleCategoryChange}
                />
              </div>
            </div>

            {/* Video Card Row */}
            <div className="showcase-section">
              <h3>Video Cards</h3>
              <div className="showcase-row">
                <VideoCard video={mockVideo} onClick={handleVideoClick} />
                <VideoCard
                  video={{ ...mockVideo, title: 'Another Demo Video' }}
                  onClick={handleVideoClick}
                />
              </div>
            </div>

            {/* Theme Selector Row */}
            <div className="showcase-section">
              <h3>Theme Selector</h3>
              <div className="showcase-row">
                <ThemeSelector showPreview={true} />
              </div>
            </div>
          </div>
        </div>

        {/* All Themes Grid */}
        <div className="all-themes-grid">
          <h2>All Available Themes</h2>
          <p>Hover to preview, click to apply:</p>

          <div className="themes-grid">
            {availableThemes.map(theme => (
              <div
                key={theme.id}
                className={`theme-card ${theme.id === currentTheme.id ? 'active' : ''}`}
                onMouseEnter={() => setPreviewTheme(theme)}
                onMouseLeave={resetToCurrentTheme}
                onClick={() => window.location.reload()} // Simulate theme change
              >
                <div className="theme-preview">
                  <div className="color-palette">
                    <div
                      className="color-swatch primary"
                      style={{ backgroundColor: theme.colors.primary }}
                    />
                    <div
                      className="color-swatch accent"
                      style={{ backgroundColor: theme.colors.accentColor }}
                    />
                    <div
                      className="color-swatch background"
                      style={{
                        backgroundColor: theme.colors.backgroundSecondary,
                      }}
                    />
                    <div
                      className="color-swatch text"
                      style={{ backgroundColor: theme.colors.textPrimary }}
                    />
                  </div>
                  <div className="preview-overlay">
                    <span>Click to Apply</span>
                  </div>
                </div>

                <div className="theme-info">
                  <h3>{theme.name}</h3>
                  <p>{theme.description}</p>
                  <div className="theme-meta">
                    <span className="category">{theme.category}</span>
                    <span className="inspiration">{theme.inspiration}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Theme Features */}
        <div className="theme-features">
          <h2>Theme System Features</h2>
          <div className="features-grid">
            <div className="feature">
              <div className="feature-icon">🎨</div>
              <h3>10 Unique Themes</h3>
              <p>
                Carefully crafted themes inspired by Netflix, YouTube, Disney+,
                HBO Max, Hulu, Apple TV+, Amazon Prime, Spotify, Plex, and our
                custom Sofathek theme.
              </p>
            </div>

            <div className="feature">
              <div className="feature-icon">👁️</div>
              <h3>Live Preview</h3>
              <p>
                Hover over any theme to instantly preview it across all
                components without applying permanently.
              </p>
            </div>

            <div className="feature">
              <div className="feature-icon">💾</div>
              <h3>Persistent Settings</h3>
              <p>
                Your theme choice is automatically saved to localStorage and
                persists across browser sessions.
              </p>
            </div>

            <div className="feature">
              <div className="feature-icon">📱</div>
              <h3>Responsive Design</h3>
              <p>
                All themes are fully responsive and optimized for desktop,
                tablet, and mobile devices.
              </p>
            </div>

            <div className="feature">
              <div className="feature-icon">♿</div>
              <h3>Accessible</h3>
              <p>
                Built with WCAG guidelines in mind, supporting high contrast
                modes and screen readers.
              </p>
            </div>

            <div className="feature">
              <div className="feature-icon">⚡</div>
              <h3>Performance Optimized</h3>
              <p>
                CSS custom properties ensure instant theme switching without
                page reloads or performance impact.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
