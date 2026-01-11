# PRP-3.1: Netflix-Style UI Components & Navigation System

## Purpose & Core Philosophy

**Transform SOFATHEK from basic template layout to immersive Netflix-like media experience through purposeful navigation architecture.**

### Before implementing navigation, ask:

- **Does this navigation pattern guide users intuitively toward content discovery?**
- **How does this component enhance the media consumption journey?**
- **Will users find content faster or get lost in complexity?**
- **Does this feel like premium streaming service navigation?**

### Core Principles

1. **Content-First Navigation**: Every navigation element should accelerate content discovery, not hinder it
2. **Contextual Hierarchy**: Navigation adapts to user context (browsing vs watching vs managing)
3. **Progressive Enhancement**: Core functionality works without JavaScript, enhanced with React
4. **Family-Friendly Flow**: Navigation accommodates different user profiles and age-appropriate content

---

## Gap Analysis: Current vs Netflix-Like Experience

### Current State Issues

- **Generic Header**: Basic template header with plain links lacks media-centric focus
- **Static Navigation**: No contextual adaptation based on user activity or content type
- **Missing Media Categories**: No prominent category browsing (Movies, Family, YouTube, etc.)
- **No Search Prominence**: Search buried in filters, not hero navigation element
- **Lacking Visual Hierarchy**: All navigation items treated equally, no content emphasis
- **No Quick Access**: Missing recently watched, continue watching, favorites shortcuts
- **Profile Blind**: Navigation doesn't adapt to selected profile or preferences

### Netflix-Like Target Experience

- **Hero Navigation Bar**: Prominent logo, category shortcuts, search, profile switcher
- **Category-Driven**: Movies, TV Shows, Family, Recently Added as primary navigation
- **Smart Search**: Autocomplete with thumbnails, recent searches, trending queries
- **Context Awareness**: Navigation changes based on current page (browse vs watch)
- **Profile Integration**: Navigation reflects selected profile preferences and restrictions
- **Quick Actions**: Continue watching, watchlist, downloads prominently accessible

---

## Implementation Strategy

### 1. Enhanced Navigation Header (`NavigationHeader`)

**Philosophy**: The header should be both functional command center and content discovery portal.

```tsx
// /frontend/src/components/NavigationHeader/NavigationHeader.tsx
import React, { memo, useState, useCallback, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useProfile, useCategories, useVideoSearch } from '../../hooks';
import { SearchAutocomplete } from './SearchAutocomplete';
import { ProfileSwitcher } from './ProfileSwitcher';
import { CategoryMenu } from './CategoryMenu';
import './NavigationHeader.css';

interface NavigationHeaderProps {
  transparent?: boolean;
  onSearchFocus?: () => void;
  variant?: 'default' | 'minimal' | 'player';
}

export const NavigationHeader = memo<NavigationHeaderProps>(
  ({ transparent = false, onSearchFocus, variant = 'default' }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const { currentProfile } = useProfile();
    const { categories } = useCategories();
    const [searchExpanded, setSearchExpanded] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Auto-collapse search on route change
    useEffect(() => {
      setSearchExpanded(false);
      setSearchQuery('');
    }, [location.pathname]);

    const handleSearchToggle = useCallback(() => {
      setSearchExpanded(!searchExpanded);
      if (!searchExpanded) {
        setTimeout(() => searchInputRef.current?.focus(), 100);
        onSearchFocus?.();
      }
    }, [searchExpanded, onSearchFocus]);

    const handleSearchSubmit = useCallback(
      (query: string) => {
        if (query.trim()) {
          navigate(`/library?search=${encodeURIComponent(query.trim())}`);
          setSearchExpanded(false);
        }
      },
      [navigate]
    );

    // Main navigation items - adapts to profile
    const mainNavItems = [
      { path: '/library', label: 'Library', icon: 'grid' },
      { path: '/library?category=movies', label: 'Movies', icon: 'film' },
      { path: '/library?category=family', label: 'Family', icon: 'heart' },
      { path: '/library?category=youtube', label: 'YouTube', icon: 'play' },
      ...(currentProfile?.isAdmin
        ? [
            { path: '/downloads', label: 'Downloads', icon: 'download' },
            { path: '/admin', label: 'Admin', icon: 'settings' },
          ]
        : []),
    ];

    const headerClasses = [
      'navigation-header',
      `navigation-header--${variant}`,
      transparent && 'navigation-header--transparent',
      searchExpanded && 'navigation-header--search-expanded',
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <header className={headerClasses}>
        <div className="navigation-header__container">
          {/* Logo Section */}
          <div className="navigation-header__brand">
            <Link to="/" className="brand-link">
              <div className="brand-logo">
                <svg viewBox="0 0 24 24" className="brand-icon">
                  <path d="M18 3v2h-2V3H8v2H6V3H4v18h2v-2h2v2h8v-2h2v2h2V3h-2zM8 17H6v-2h2v2zm0-4H6v-2h2v2zm0-4H6V7h2v2zm10 8h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V7h2v2z" />
                </svg>
                <span className="brand-text">SOFATHEK</span>
              </div>
            </Link>
          </div>

          {/* Main Navigation */}
          {variant !== 'player' && (
            <nav className="navigation-header__nav">
              <ul className="nav-list">
                {mainNavItems.map(item => (
                  <li key={item.path} className="nav-item">
                    <Link
                      to={item.path}
                      className={`nav-link ${location.pathname === item.path ? 'nav-link--active' : ''}`}
                    >
                      <svg className="nav-icon" viewBox="0 0 24 24">
                        {/* Icon paths based on item.icon */}
                      </svg>
                      <span className="nav-label">{item.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          )}

          {/* Actions Section */}
          <div className="navigation-header__actions">
            {/* Search */}
            <div className={`search-container ${searchExpanded ? 'search-container--expanded' : ''}`}>
              <button
                className="search-toggle"
                onClick={handleSearchToggle}
                aria-label={searchExpanded ? 'Close search' : 'Open search'}
              >
                <svg viewBox="0 0 24 24" className="search-icon">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
              </button>

              {searchExpanded && (
                <SearchAutocomplete
                  ref={searchInputRef}
                  value={searchQuery}
                  onChange={setSearchQuery}
                  onSubmit={handleSearchSubmit}
                  placeholder="Search movies, shows, videos..."
                  className="search-input"
                />
              )}
            </div>

            {/* Profile Switcher */}
            <ProfileSwitcher currentProfile={currentProfile} variant="compact" />
          </div>
        </div>
      </header>
    );
  }
);

NavigationHeader.displayName = 'NavigationHeader';
```

### 2. Smart Search Autocomplete (`SearchAutocomplete`)

**Philosophy**: Search should feel instant and visually rich, providing immediate feedback with thumbnails and categories.

```tsx
// /frontend/src/components/NavigationHeader/SearchAutocomplete.tsx
import React, { forwardRef, useState, useEffect, useRef, useCallback } from 'react';
import { useDebounce } from '../../hooks/useDebounce';
import { useVideoSearch } from '../../hooks/useVideoSearch';
import { Video } from '../../types';
import './SearchAutocomplete.css';

interface SearchAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (query: string) => void;
  placeholder?: string;
  className?: string;
}

export const SearchAutocomplete = forwardRef<HTMLInputElement, SearchAutocompleteProps>(
  ({ value, onChange, onSubmit, placeholder = 'Search...', className = '' }, ref) => {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const resultsRef = useRef<HTMLDivElement>(null);
    const debouncedQuery = useDebounce(value, 300);

    const { searchResults, loading, recentSearches, trendingQueries, addRecentSearch } = useVideoSearch(debouncedQuery);

    const hasResults = searchResults.length > 0;
    const showSuggestions = isOpen && (hasResults || recentSearches.length > 0 || trendingQueries.length > 0);

    const handleInputFocus = useCallback(() => {
      setIsOpen(true);
      setSelectedIndex(-1);
    }, []);

    const handleInputBlur = useCallback((e: React.FocusEvent) => {
      // Delay hiding to allow click events on results
      setTimeout(() => {
        if (!resultsRef.current?.contains(e.relatedTarget as Node)) {
          setIsOpen(false);
        }
      }, 150);
    }, []);

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        if (!showSuggestions) return;

        const totalItems = hasResults ? searchResults.length : recentSearches.length + trendingQueries.length;

        switch (e.key) {
          case 'ArrowDown':
            e.preventDefault();
            setSelectedIndex(prev => (prev + 1) % totalItems);
            break;
          case 'ArrowUp':
            e.preventDefault();
            setSelectedIndex(prev => (prev <= 0 ? totalItems - 1 : prev - 1));
            break;
          case 'Enter':
            e.preventDefault();
            if (selectedIndex >= 0) {
              // Handle selection
              if (hasResults && selectedIndex < searchResults.length) {
                const selectedVideo = searchResults[selectedIndex];
                handleVideoSelect(selectedVideo);
              } else {
                // Handle suggestion selection
                const suggestions = [...recentSearches, ...trendingQueries];
                const suggestion = suggestions[selectedIndex - (hasResults ? searchResults.length : 0)];
                if (suggestion) {
                  onChange(suggestion);
                  onSubmit(suggestion);
                }
              }
            } else if (value.trim()) {
              onSubmit(value);
              addRecentSearch(value);
            }
            break;
          case 'Escape':
            setIsOpen(false);
            break;
        }
      },
      [
        showSuggestions,
        selectedIndex,
        searchResults,
        recentSearches,
        trendingQueries,
        hasResults,
        value,
        onChange,
        onSubmit,
        addRecentSearch,
      ]
    );

    const handleVideoSelect = useCallback((video: Video) => {
      // Navigate directly to video
      window.location.href = `/watch/${video.id}`;
    }, []);

    const handleSuggestionClick = useCallback(
      (suggestion: string) => {
        onChange(suggestion);
        onSubmit(suggestion);
        addRecentSearch(suggestion);
        setIsOpen(false);
      },
      [onChange, onSubmit, addRecentSearch]
    );

    return (
      <div className={`search-autocomplete ${className}`}>
        <input
          ref={ref}
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="search-autocomplete__input"
          autoComplete="off"
          spellCheck={false}
        />

        {showSuggestions && (
          <div ref={resultsRef} className="search-autocomplete__dropdown">
            {/* Video Results */}
            {hasResults && (
              <div className="search-results">
                <div className="results-header">
                  <h4>Videos</h4>
                  <span className="results-count">({searchResults.length})</span>
                </div>
                {searchResults.map((video, index) => (
                  <button
                    key={video.id}
                    className={`search-result ${selectedIndex === index ? 'search-result--selected' : ''}`}
                    onClick={() => handleVideoSelect(video)}
                  >
                    <div className="result-thumbnail">
                      <img src={video.thumbnail} alt={video.title} loading="lazy" />
                      <div className="duration">{video.duration}</div>
                    </div>
                    <div className="result-info">
                      <h5 className="result-title">{video.title}</h5>
                      <p className="result-category">{video.category}</p>
                      {video.description && <p className="result-description">{video.description.slice(0, 80)}...</p>}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Recent Searches */}
            {!hasResults && recentSearches.length > 0 && (
              <div className="search-suggestions">
                <h4 className="suggestions-header">Recent Searches</h4>
                {recentSearches.map((search, index) => (
                  <button
                    key={`recent-${index}`}
                    className={`search-suggestion ${selectedIndex === index ? 'search-suggestion--selected' : ''}`}
                    onClick={() => handleSuggestionClick(search)}
                  >
                    <svg className="suggestion-icon" viewBox="0 0 24 24">
                      <path d="M12 2L13.09 8.26L22 9L13.09 9.74L12 16L10.91 9.74L2 9L10.91 8.26L12 2Z" />
                    </svg>
                    <span className="suggestion-text">{search}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Trending Queries */}
            {!hasResults && trendingQueries.length > 0 && (
              <div className="search-suggestions">
                <h4 className="suggestions-header">Trending</h4>
                {trendingQueries.map((query, index) => {
                  const adjustedIndex = index + recentSearches.length;
                  return (
                    <button
                      key={`trending-${index}`}
                      className={`search-suggestion ${selectedIndex === adjustedIndex ? 'search-suggestion--selected' : ''}`}
                      onClick={() => handleSuggestionClick(query)}
                    >
                      <svg className="suggestion-icon" viewBox="0 0 24 24">
                        <path d="M7.5 21L3 16.5L7.5 12L12 16.5L7.5 21ZM2.22 9L1 8L8.96 2.04L10.94 4L2.22 9ZM15.96 10.04L13.98 8.06L21.78 3L23 4L15.96 10.04Z" />
                      </svg>
                      <span className="suggestion-text">{query}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Loading State */}
            {loading && (
              <div className="search-loading">
                <div className="loading-spinner"></div>
                <span>Searching...</span>
              </div>
            )}

            {/* No Results */}
            {debouncedQuery && !loading && !hasResults && (
              <div className="search-empty">
                <p>No videos found for "{debouncedQuery}"</p>
                <button className="search-all-button" onClick={() => onSubmit(value)}>
                  Search all content →
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
);

SearchAutocomplete.displayName = 'SearchAutocomplete';
```

### 3. Category Navigation Menu (`CategoryMenu`)

**Philosophy**: Categories should be discoverable shortcuts that respect user profile restrictions and preferences.

```tsx
// /frontend/src/components/NavigationHeader/CategoryMenu.tsx
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCategories, useProfile } from '../../hooks';
import { Category } from '../../types';
import './CategoryMenu.css';

export const CategoryMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const { categories, featuredCategories } = useCategories();
  const { currentProfile } = useProfile();

  // Filter categories based on profile restrictions
  const visibleCategories = categories.filter(category => {
    if (!currentProfile?.restrictions?.contentRating) return true;
    return category.allowedRatings?.includes(currentProfile.restrictions.contentRating);
  });

  const handleCategoryClick = useCallback(
    (category: Category) => {
      navigate(`/library?category=${encodeURIComponent(category.slug)}`);
      setIsOpen(false);
    },
    [navigate]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setFocusedIndex(prev => (prev + 1) % visibleCategories.length);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setFocusedIndex(prev => (prev <= 0 ? visibleCategories.length - 1 : prev - 1));
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          if (focusedIndex >= 0 && visibleCategories[focusedIndex]) {
            handleCategoryClick(visibleCategories[focusedIndex]);
          }
          break;
        case 'Escape':
          setIsOpen(false);
          setFocusedIndex(-1);
          break;
      }
    },
    [isOpen, focusedIndex, visibleCategories, handleCategoryClick]
  );

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  return (
    <div className="category-menu" ref={menuRef}>
      <button
        className={`category-toggle ${isOpen ? 'category-toggle--active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        <span>Browse</span>
        <svg className={`toggle-icon ${isOpen ? 'toggle-icon--open' : ''}`} viewBox="0 0 24 24">
          <path d="m7 10 5 5 5-5H7z" />
        </svg>
      </button>

      {isOpen && (
        <div className="category-dropdown" role="menu">
          {/* Featured Categories */}
          {featuredCategories.length > 0 && (
            <div className="category-section">
              <h4 className="section-title">Featured</h4>
              <div className="featured-categories">
                {featuredCategories.map((category, index) => (
                  <button
                    key={category.id}
                    className={`featured-category ${focusedIndex === index ? 'featured-category--focused' : ''}`}
                    onClick={() => handleCategoryClick(category)}
                    role="menuitem"
                    style={{
                      backgroundImage: category.coverImage ? `url(${category.coverImage})` : undefined,
                    }}
                  >
                    <div className="category-overlay">
                      <h5 className="category-title">{category.name}</h5>
                      <p className="category-count">{category.videoCount} videos</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* All Categories */}
          <div className="category-section">
            <h4 className="section-title">Categories</h4>
            <div className="category-grid">
              {visibleCategories.map((category, index) => {
                const adjustedIndex = index + featuredCategories.length;
                return (
                  <button
                    key={category.id}
                    className={`category-item ${focusedIndex === adjustedIndex ? 'category-item--focused' : ''}`}
                    onClick={() => handleCategoryClick(category)}
                    role="menuitem"
                  >
                    <div className="category-icon">
                      {category.icon ? (
                        <img src={category.icon} alt="" />
                      ) : (
                        <svg viewBox="0 0 24 24">
                          <path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-1 9H9V9h10v2zm-4 4H9v-2h6v2zm4-8H9V5h10v2z" />
                        </svg>
                      )}
                    </div>
                    <div className="category-info">
                      <h5 className="category-name">{category.name}</h5>
                      <p className="category-meta">
                        {category.videoCount} videos
                        {category.newCount > 0 && <span className="new-badge">{category.newCount} new</span>}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="category-section">
            <div className="quick-actions">
              <Link to="/library?sort=recent" className="quick-action">
                <svg viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                </svg>
                Recently Added
              </Link>
              <Link to="/library?filter=watchlist" className="quick-action">
                <svg viewBox="0 0 24 24">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
                My Watchlist
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
```

### 4. Responsive CSS Architecture

**Philosophy**: Navigation should adapt fluidly across devices while maintaining Netflix-like elegance.

```css
/* /frontend/src/components/NavigationHeader/NavigationHeader.css */
.navigation-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: var(--z-navigation);
  background: linear-gradient(
    180deg,
    rgba(var(--color-background-rgb), 0.95) 0%,
    rgba(var(--color-background-rgb), 0.8) 70%,
    rgba(var(--color-background-rgb), 0) 100%
  );
  backdrop-filter: blur(10px);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  height: var(--nav-height, 4rem);
  border-bottom: 1px solid rgba(var(--color-border-rgb), 0.1);
}

.navigation-header--transparent {
  background: transparent;
  border-bottom-color: transparent;
}

.navigation-header--player {
  background: rgba(0, 0, 0, 0.8);
  height: var(--nav-height-minimal, 3rem);
}

.navigation-header__container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 100%;
  max-width: var(--max-width);
  margin: 0 auto;
  padding: 0 var(--spacing-lg);
  gap: var(--spacing-xl);
}

/* Brand Section */
.navigation-header__brand {
  flex-shrink: 0;
}

.brand-link {
  display: flex;
  align-items: center;
  text-decoration: none;
  color: var(--color-primary);
  transition: opacity 0.2s ease;
}

.brand-link:hover {
  opacity: 0.8;
}

.brand-logo {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.brand-icon {
  width: 2rem;
  height: 2rem;
  fill: currentColor;
}

.brand-text {
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: 0.05em;
}

/* Main Navigation */
.navigation-header__nav {
  flex: 1;
  display: flex;
  justify-content: center;
}

.nav-list {
  display: flex;
  align-items: center;
  gap: var(--spacing-lg);
  margin: 0;
  padding: 0;
  list-style: none;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-md);
  text-decoration: none;
  color: var(--color-text-secondary);
  font-weight: 500;
  transition: all 0.2s ease;
  position: relative;
}

.nav-link:hover {
  color: var(--color-text);
  background: rgba(var(--color-primary-rgb), 0.1);
}

.nav-link--active {
  color: var(--color-primary);
  background: rgba(var(--color-primary-rgb), 0.15);
}

.nav-link--active::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: var(--spacing-md);
  right: var(--spacing-md);
  height: 2px;
  background: var(--color-primary);
  border-radius: 1px;
}

.nav-icon {
  width: 1.25rem;
  height: 1.25rem;
  flex-shrink: 0;
}

.nav-label {
  white-space: nowrap;
}

/* Actions Section */
.navigation-header__actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  flex-shrink: 0;
}

/* Search Container */
.search-container {
  position: relative;
  display: flex;
  align-items: center;
}

.search-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.search-toggle:hover {
  color: var(--color-text);
  background: rgba(var(--color-text-rgb), 0.1);
}

.search-icon {
  width: 1.25rem;
  height: 1.25rem;
  stroke: currentColor;
  fill: none;
  stroke-width: 2;
}

.search-container--expanded .search-toggle {
  color: var(--color-primary);
}

/* Responsive Breakpoints */

/* Tablet */
@container (max-width: 768px) {
  .navigation-header__container {
    padding: 0 var(--spacing-md);
    gap: var(--spacing-md);
  }

  .nav-list {
    gap: var(--spacing-md);
  }

  .nav-label {
    display: none;
  }

  .nav-link {
    padding: var(--spacing-sm);
    border-radius: 50%;
    width: 2.5rem;
    height: 2.5rem;
    justify-content: center;
  }

  .brand-text {
    font-size: 1.25rem;
  }
}

/* Mobile */
@container (max-width: 480px) {
  .navigation-header {
    height: var(--nav-height-mobile, 3.5rem);
  }

  .navigation-header__container {
    padding: 0 var(--spacing-sm);
    gap: var(--spacing-sm);
  }

  .navigation-header__nav {
    display: none;
  }

  .brand-icon {
    width: 1.5rem;
    height: 1.5rem;
  }

  .brand-text {
    font-size: 1.125rem;
  }

  /* Mobile navigation overlay */
  .navigation-header--search-expanded {
    height: 100vh;
    background: var(--color-background);
  }

  .navigation-header--search-expanded .navigation-header__container {
    flex-direction: column;
    align-items: stretch;
    padding-top: var(--spacing-lg);
  }
}

/* Dark mode adaptations */
@media (prefers-color-scheme: dark) {
  .navigation-header {
    background: linear-gradient(180deg, rgba(0, 0, 0, 0.95) 0%, rgba(0, 0, 0, 0.8) 70%, rgba(0, 0, 0, 0) 100%);
  }
}

/* High contrast mode */
@media (prefers-contrast: high) {
  .navigation-header {
    border-bottom: 2px solid var(--color-border);
    background: var(--color-background);
    backdrop-filter: none;
  }

  .nav-link--active::after {
    height: 3px;
  }
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .navigation-header,
  .nav-link,
  .search-toggle {
    transition: none;
  }
}
```

---

## Integration with Layout System

### Update Main Layout Component

```tsx
// /frontend/src/components/Layout.tsx - Enhanced version
import React, { ReactNode, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { NavigationHeader } from './NavigationHeader';
import { MobileNavigation } from './MobileNavigation';
import { useViewportSize } from '../hooks';
import './Layout.css';

interface LayoutProps {
  children: ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const { isMobile } = useViewportSize();
  const [searchFocused, setSearchFocused] = useState(false);

  // Determine navigation variant based on current route
  const getNavigationVariant = () => {
    if (location.pathname.startsWith('/watch/')) return 'player';
    if (location.pathname === '/') return 'minimal';
    return 'default';
  };

  const isPlayerPage = location.pathname.startsWith('/watch/');

  return (
    <div className="layout">
      <NavigationHeader
        variant={getNavigationVariant()}
        transparent={location.pathname === '/'}
        onSearchFocus={() => setSearchFocused(true)}
      />

      <main
        className={`layout-main ${isPlayerPage ? 'layout-main--player' : ''} ${searchFocused ? 'layout-main--search-focused' : ''}`}
        style={{ paddingTop: isPlayerPage ? 'var(--nav-height-minimal)' : 'var(--nav-height)' }}
      >
        {children}
      </main>

      {isMobile && !isPlayerPage && <MobileNavigation />}
    </div>
  );
};
```

---

## Anti-Patterns to Avoid

❌ **Generic Template Navigation**: Don't use standard website navigation patterns for media applications

- **Why bad**: Users expect streaming service patterns, not website patterns
- **Better**: Implement category-first navigation with media-specific actions

❌ **Search as Afterthought**: Don't hide search functionality or make it text-only

- **Why bad**: Search is primary content discovery method in media applications
- **Better**: Prominent search with visual autocomplete and thumbnails

❌ **Static Navigation**: Don't treat all navigation items equally regardless of context

- **Why bad**: User needs change based on what they're doing (browsing vs watching)
- **Better**: Contextual navigation that adapts to user activity

❌ **Profile-Blind Navigation**: Don't ignore user profile restrictions in navigation

- **Why bad**: Family members see inappropriate content options
- **Better**: Filter navigation based on profile age ratings and preferences

❌ **Mobile Desktop Parity**: Don't force desktop navigation patterns on mobile

- **Why bad**: Touch interfaces need different interaction patterns
- **Better**: Platform-specific navigation optimized for touch gestures

---

## Validation & Testing Strategy

### Multi-Level Testing Approach

**Level 1: Component Unit Tests**

```tsx
// Example test for NavigationHeader
describe('NavigationHeader', () => {
  it('adapts navigation items based on user profile', () => {
    const { rerender } = render(<NavigationHeader />, {
      wrapper: ({ children }) => <ProfileProvider profile={childProfile}>{children}</ProfileProvider>,
    });

    expect(screen.queryByText('Admin')).not.toBeInTheDocument();

    rerender(<NavigationHeader />);
    // ... admin profile test
  });
});
```

**Level 2: Integration Testing**

- Test navigation with search functionality
- Test category menu with profile restrictions
- Test responsive behavior across breakpoints

**Level 3: E2E User Journey Testing**

- Navigate from homepage to video using different paths
- Search for content and verify results navigation
- Test mobile navigation patterns

**Level 4: Accessibility Validation**

- Keyboard navigation through all components
- Screen reader compatibility for all interactive elements
- High contrast mode visual verification

### Success Metrics

- **Navigation Efficiency**: Users can reach any video in ≤3 clicks
- **Search Engagement**: 70% of users try search functionality within first session
- **Category Discovery**: 50% of users browse categories beyond landing page
- **Mobile Usability**: Touch targets meet minimum 44px standard
- **Performance**: Navigation components render in <100ms
- **Accessibility**: WCAG 2.1 AA compliance score >95%

---

## Variation Guidance

**IMPORTANT**: Navigation implementations should vary based on context and user needs.

**Vary by Content Volume**:

- **Large Libraries**: Emphasize search and filtering
- **Small Collections**: Focus on browsing and discovery
- **Mixed Content**: Balance search and category navigation

**Vary by User Profile**:

- **Child Profiles**: Larger touch targets, simplified categories
- **Adult Profiles**: Full feature access, advanced search options
- **Admin Profiles**: Additional management and configuration options

**Vary by Device Context**:

- **Desktop**: Full horizontal navigation with hover states
- **Tablet**: Compact navigation with touch-optimized spacing
- **Mobile**: Collapsible navigation with bottom tab bar

**Avoid converging on generic streaming service clones** - adapt patterns to your specific content and user needs while maintaining Netflix-like quality and polish.

---

## Remember

**Navigation is the gateway to content discovery.** Every navigation decision should accelerate users toward the content they want to watch.

The best media navigation systems:

- Prioritize content over interface complexity
- Adapt intelligently to user context and preferences
- Provide multiple discovery paths (search, browse, recommendations)
- Feel responsive and immediate across all devices

**This navigation framework empowers SOFATHEK to feel like a premium streaming service while serving family-specific needs.**
