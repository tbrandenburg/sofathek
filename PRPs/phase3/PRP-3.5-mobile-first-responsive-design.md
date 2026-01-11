# PRP-3.5: Mobile-First Responsive Design

## Purpose & Core Philosophy

**Transform SOFATHEK into a seamless cross-device experience that prioritizes mobile interaction patterns while scaling elegantly to desktop, ensuring optimal performance and usability across all form factors.**

### Before implementing mobile-first design, ask:

- **Does this design pattern work effortlessly with thumb navigation?**
- **How does this component adapt without sacrificing core functionality?**
- **Will users have the same quality experience regardless of device?**
- **Does the interaction model respect platform conventions?**

### Core Principles

1. **Touch-First Interaction Design**: Every interface element optimized for finger-based interaction
2. **Progressive Enhancement Architecture**: Core functionality works on basic devices, enhanced features scale up
3. **Container Queries Over Media Queries**: Components adapt to their container, not just viewport
4. **Performance-Conscious Responsive**: Minimize layout shifts and optimize for mobile network conditions
5. **Platform-Adaptive UX**: Respect iOS, Android, and desktop interaction patterns

---

## Gap Analysis: Current vs Mobile-First Experience

### Current State Issues

- **Desktop-Centric Design**: Layout and interactions designed for mouse/keyboard, poorly adapted for touch
- **Viewport-Only Responsiveness**: Uses only viewport media queries, doesn't adapt to container contexts
- **Touch Target Issues**: Small buttons and links that don't meet accessibility guidelines (44px minimum)
- **Performance Blind**: Same assets and interactions served regardless of device capabilities
- **Generic Mobile Experience**: Doesn't leverage platform-specific features or interaction patterns
- **Layout Shift Problems**: Content jumps around as images and components load on slower connections
- **Poor Offline Experience**: No consideration for intermittent connectivity or offline usage

### Mobile-First Target Experience

- **Thumb-Optimized Navigation**: All primary actions accessible within thumb reach zones
- **Container-Aware Components**: Components adapt to available space using Container Queries
- **Touch-Gesture Support**: Swipe navigation, pull-to-refresh, pinch-to-zoom where appropriate
- **Progressive Loading**: Content loads progressively with skeleton states and lazy loading
- **Platform Integration**: Leverages iOS/Android specific features (haptics, notch handling, safe areas)
- **Offline-Ready Architecture**: Core browsing functionality works without internet connection
- **Performance Budget**: Optimized for 3G networks with aggressive caching and compression

---

## Implementation Strategy

### 1. Container Queries Architecture (`ResponsiveComponents`)

**Philosophy**: Components should be context-aware, adapting to their container rather than only viewport size.

```css
/* /frontend/src/styles/responsive-foundation.css */

/* === CONTAINER QUERIES FOUNDATION === */

/* Establish container contexts for all major components */
.layout-main,
.video-grid,
.navigation-header,
.profile-selector,
.theme-customizer {
  container-type: inline-size;
}

/* Named container queries for specific use cases */
.video-grid {
  container-name: video-grid;
}

.navigation-header {
  container-name: navigation;
}

.sidebar {
  container-name: sidebar;
  container-type: inline-size;
}

/* === RESPONSIVE BREAKPOINT SYSTEM === */

/* Container query breakpoints (preferred) */
@container (max-width: 320px) {
  /* Extra small containers */
  .responsive-component {
    --component-padding: var(--spacing-xs);
    --component-font-size: var(--font-size-sm);
    --component-gap: var(--spacing-xs);
  }
}

@container (min-width: 321px) and (max-width: 640px) {
  /* Small containers */
  .responsive-component {
    --component-padding: var(--spacing-sm);
    --component-font-size: var(--font-size-base);
    --component-gap: var(--spacing-sm);
  }
}

@container (min-width: 641px) and (max-width: 1024px) {
  /* Medium containers */
  .responsive-component {
    --component-padding: var(--spacing-md);
    --component-font-size: var(--font-size-base);
    --component-gap: var(--spacing-md);
  }
}

@container (min-width: 1025px) {
  /* Large containers */
  .responsive-component {
    --component-padding: var(--spacing-lg);
    --component-font-size: var(--font-size-lg);
    --component-gap: var(--spacing-lg);
  }
}

/* Viewport media queries (fallback and global styles) */
@media (max-width: 640px) {
  :root {
    /* Mobile-first CSS variables */
    --nav-height: var(--nav-height-mobile, 3.5rem);
    --sidebar-width: 100vw; /* Full-width mobile sidebar */
    --max-content-width: 100%;
    --grid-columns: 2;
    --font-scale: 0.9; /* Slightly smaller text on mobile */
  }

  /* Global mobile adjustments */
  body {
    font-size: calc(var(--font-size-base) * var(--font-scale));
    overflow-x: hidden; /* Prevent horizontal scroll */
  }

  /* Touch-friendly scroll bars */
  ::-webkit-scrollbar {
    width: 8px;
  }

  ::-webkit-scrollbar-thumb {
    background: rgba(var(--color-text-rgb), 0.3);
    border-radius: 4px;
  }
}

@media (min-width: 641px) and (max-width: 1024px) {
  :root {
    /* Tablet variables */
    --nav-height: var(--nav-height, 4rem);
    --sidebar-width: var(--sidebar-width-tablet, 20rem);
    --grid-columns: 3;
    --font-scale: 1;
  }
}

@media (min-width: 1025px) {
  :root {
    /* Desktop variables */
    --nav-height: var(--nav-height, 4rem);
    --sidebar-width: var(--sidebar-width, 16rem);
    --grid-columns: 4;
    --font-scale: 1;
  }
}

/* === TOUCH-OPTIMIZED INTERACTION === */

/* Minimum touch target sizes (WCAG 2.1 AA) */
.touch-target {
  min-height: 44px;
  min-width: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

/* Extended touch area for small visual elements */
.touch-target--extended::before {
  content: '';
  position: absolute;
  inset: -8px;
  z-index: -1;
}

/* Touch feedback */
@media (hover: none) and (pointer: coarse) {
  /* Touch device styles */
  .interactive-element {
    transition:
      transform 0.1s ease,
      background-color 0.1s ease;
  }

  .interactive-element:active {
    transform: scale(0.98);
    background-color: rgba(var(--color-primary-rgb), 0.1);
  }

  /* Disable hover states on touch devices */
  .hover-only {
    display: none;
  }
}

/* === PLATFORM-SPECIFIC ADAPTATIONS === */

/* iOS Safe Area Support */
@supports (padding: max(0px)) {
  .ios-safe-area {
    padding-top: max(var(--nav-height), env(safe-area-inset-top));
    padding-bottom: max(var(--spacing-md), env(safe-area-inset-bottom));
    padding-left: max(var(--spacing-sm), env(safe-area-inset-left));
    padding-right: max(var(--spacing-sm), env(safe-area-inset-right));
  }
}

/* Android navigation bar spacing */
@media (display-mode: standalone) {
  .pwa-nav-spacing {
    padding-bottom: calc(var(--spacing-lg) + env(safe-area-inset-bottom, 0px));
  }
}

/* Notch and Dynamic Island handling */
@media (orientation: landscape) {
  .notch-aware {
    padding-left: max(var(--spacing-md), env(safe-area-inset-left));
    padding-right: max(var(--spacing-md), env(safe-area-inset-right));
  }
}
```

### 2. Touch-Optimized Navigation (`MobileNavigation`)

**Philosophy**: Mobile navigation should be thumb-driven with easily accessible primary actions.

```tsx
// /frontend/src/components/MobileNavigation/MobileNavigation.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useProfile } from '../../hooks/useProfile';
import { useSwipeable } from 'react-swipeable';
import { ProfileSwitcher } from '../ProfileSelector/ProfileSwitcher';
import { QuickActions } from './QuickActions';
import './MobileNavigation.css';

interface MobileNavigationProps {
  className?: string;
}

export const MobileNavigation: React.FC<MobileNavigationProps> = ({ className = '' }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentProfile } = useProfile();
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState(location.pathname);
  const navRef = useRef<HTMLDivElement>(null);

  // Navigation items with thumb-reach optimization
  const navigationItems = [
    {
      path: '/library',
      icon: 'library',
      label: 'Library',
      position: 'primary', // Most accessible position
    },
    {
      path: '/search',
      icon: 'search',
      label: 'Search',
      position: 'secondary',
    },
    {
      path: '/downloads',
      icon: 'download',
      label: 'Downloads',
      position: 'secondary',
      adminOnly: true,
    },
    {
      path: '/profile',
      icon: 'profile',
      label: 'Profile',
      position: 'primary',
    },
  ].filter(item => !item.adminOnly || currentProfile?.isAdmin);

  // Swipe gestures for navigation
  const swipeHandlers = useSwipeable({
    onSwipedUp: () => {
      if (!isExpanded) {
        setIsExpanded(true);
      }
    },
    onSwipedDown: () => {
      if (isExpanded) {
        setIsExpanded(false);
      }
    },
    onSwipedLeft: () => {
      navigateToNext();
    },
    onSwipedRight: () => {
      navigateToPrevious();
    },
    trackMouse: false,
    preventScrollOnSwipe: true,
    delta: 50,
  });

  const navigateToNext = useCallback(() => {
    const currentIndex = navigationItems.findIndex(item => item.path === activeTab);
    const nextIndex = (currentIndex + 1) % navigationItems.length;
    const nextItem = navigationItems[nextIndex];

    navigate(nextItem.path);

    // Haptic feedback if supported
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
  }, [navigationItems, activeTab, navigate]);

  const navigateToPrevious = useCallback(() => {
    const currentIndex = navigationItems.findIndex(item => item.path === activeTab);
    const prevIndex = currentIndex === 0 ? navigationItems.length - 1 : currentIndex - 1;
    const prevItem = navigationItems[prevIndex];

    navigate(prevItem.path);

    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
  }, [navigationItems, activeTab, navigate]);

  // Update active tab when location changes
  useEffect(() => {
    setActiveTab(location.pathname);
    setIsExpanded(false);
  }, [location.pathname]);

  // Close expanded nav when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setIsExpanded(false);
      }
    };

    if (isExpanded) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isExpanded]);

  return (
    <nav
      ref={navRef}
      className={`mobile-navigation ${isExpanded ? 'mobile-navigation--expanded' : ''} ${className}`}
      {...swipeHandlers}
      role="navigation"
      aria-label="Main navigation"
    >
      {/* Swipe indicator */}
      <div className="swipe-indicator" aria-hidden="true">
        <div className="swipe-handle"></div>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="mobile-navigation__expanded">
          <QuickActions profile={currentProfile} />
          <ProfileSwitcher compact onClose={() => setIsExpanded(false)} />
        </div>
      )}

      {/* Main navigation tabs */}
      <div className="mobile-navigation__tabs">
        {navigationItems.map((item, index) => {
          const isActive = activeTab.startsWith(item.path);

          return (
            <button
              key={item.path}
              className={`nav-tab ${isActive ? 'nav-tab--active' : ''}`}
              onClick={() => navigate(item.path)}
              aria-label={`Navigate to ${item.label}`}
              data-position={item.position}
              style={{
                // Optimize for thumb reach
                order: item.position === 'primary' ? index : index + 10,
              }}
            >
              <div className="nav-tab__icon">
                <svg viewBox="0 0 24 24" className="icon">
                  {getNavIcon(item.icon)}
                </svg>
                {isActive && <div className="nav-tab__active-indicator" aria-hidden="true" />}
              </div>

              <span className="nav-tab__label">{item.label}</span>

              {/* Badge for notifications/counts */}
              {item.path === '/downloads' && <NotificationBadge type="downloads" />}
            </button>
          );
        })}
      </div>

      {/* Safe area spacer for devices with home indicators */}
      <div className="mobile-navigation__safe-area" />
    </nav>
  );
};

// Icon component
function getNavIcon(iconName: string): React.ReactNode {
  const icons = {
    library: (
      <path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-1 9H9V9h10v2zm-4 4H9v-2h6v2zm4-8H9V5h10v2z" />
    ),
    search: (
      <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
    ),
    download: <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />,
    profile: (
      <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 3.5C14.8 3.4 14.6 3.3 14.4 3.3L13.6 3.8C13.2 4.1 12.8 4.1 12.4 3.8L11.6 3.3C11.4 3.3 11.2 3.4 11 3.5L5 7V9H7V20C7 21.1 7.9 22 9 22H11V16H13V22H15C16.1 22 17 21.1 17 20V9H21Z" />
    ),
  };

  return icons[iconName as keyof typeof icons] || null;
}

// Notification badge component
const NotificationBadge: React.FC<{ type: string }> = ({ type }) => {
  // This would connect to actual notification state
  const count = 0; // Placeholder

  if (count === 0) return null;

  return (
    <div className="notification-badge">
      <span className="sr-only">{count} notifications</span>
      <div className="badge-dot" aria-hidden="true">
        {count > 99 ? '99+' : count}
      </div>
    </div>
  );
};
```

### 3. Progressive Loading System (`ProgressiveLoader`)

**Philosophy**: Content should load progressively with meaningful skeleton states and smooth transitions.

```tsx
// /frontend/src/components/ProgressiveLoader/ProgressiveLoader.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useIntersectionObserver } from '../../hooks/useIntersectionObserver';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import './ProgressiveLoader.css';

interface ProgressiveLoaderProps {
  children: React.ReactNode;
  skeleton: React.ReactNode;
  loadingComponent?: React.ReactNode;
  errorComponent?: React.ReactNode;
  delay?: number;
  threshold?: number;
  rootMargin?: string;
  priority?: 'low' | 'medium' | 'high';
  retryCount?: number;
}

export const ProgressiveLoader: React.FC<ProgressiveLoaderProps> = ({
  children,
  skeleton,
  loadingComponent,
  errorComponent,
  delay = 0,
  threshold = 0.1,
  rootMargin = '50px',
  priority = 'medium',
  retryCount = 3,
}) => {
  const [loadState, setLoadState] = useState<'idle' | 'loading' | 'loaded' | 'error'>('idle');
  const [retries, setRetries] = useState(0);
  const [loadStartTime, setLoadStartTime] = useState<number | null>(null);
  const { isOnline, effectiveType } = useNetworkStatus();
  const elementRef = useRef<HTMLDivElement>(null);

  // Intersection observer for lazy loading
  const [intersectionRef, isIntersecting] = useIntersectionObserver({
    threshold,
    rootMargin,
    triggerOnce: true,
  });

  // Adaptive delay based on network conditions
  const adaptiveDelay = useCallback(() => {
    const baseDelay = delay;

    // Increase delay on slow connections
    const networkMultiplier =
      effectiveType === 'slow-2g' ? 3 : effectiveType === '2g' ? 2 : effectiveType === '3g' ? 1.5 : 1;

    // Priority adjustment
    const priorityMultiplier = priority === 'high' ? 0.5 : priority === 'low' ? 2 : 1;

    return Math.max(0, baseDelay * networkMultiplier * priorityMultiplier);
  }, [delay, effectiveType, priority]);

  // Start loading when element comes into view
  useEffect(() => {
    if (isIntersecting && loadState === 'idle' && isOnline) {
      const finalDelay = adaptiveDelay();

      setLoadStartTime(Date.now());

      setTimeout(() => {
        setLoadState('loading');

        // Simulate content loading (replace with actual loading logic)
        loadContent()
          .then(() => {
            setLoadState('loaded');

            // Performance tracking
            if (loadStartTime) {
              const loadTime = Date.now() - loadStartTime;
              reportLoadTime(loadTime, priority, effectiveType);
            }
          })
          .catch(() => {
            setLoadState('error');
          });
      }, finalDelay);
    }
  }, [isIntersecting, loadState, isOnline, adaptiveDelay, priority, effectiveType, loadStartTime]);

  // Retry logic
  const handleRetry = useCallback(() => {
    if (retries < retryCount) {
      setRetries(prev => prev + 1);
      setLoadState('idle');
    }
  }, [retries, retryCount]);

  // Offline handling
  useEffect(() => {
    if (!isOnline && loadState === 'loading') {
      setLoadState('error');
    }
  }, [isOnline, loadState]);

  const combineRefs = useCallback(
    (node: HTMLDivElement | null) => {
      elementRef.current = node;
      intersectionRef(node);
    },
    [intersectionRef]
  );

  return (
    <div ref={combineRefs} className={`progressive-loader progressive-loader--${loadState}`} data-priority={priority}>
      {loadState === 'idle' && skeleton}

      {loadState === 'loading' &&
        (loadingComponent || (
          <div className="progressive-loader__loading">
            {skeleton}
            <div className="loading-overlay">
              <div className="loading-spinner" />
            </div>
          </div>
        ))}

      {loadState === 'loaded' && children}

      {loadState === 'error' &&
        (errorComponent || (
          <div className="progressive-loader__error">
            <div className="error-content">
              <svg className="error-icon" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
              </svg>

              <h4>Content unavailable</h4>
              <p>{!isOnline ? 'Check your internet connection' : 'Something went wrong'}</p>

              {retries < retryCount && (
                <button className="retry-button" onClick={handleRetry}>
                  Try Again ({retryCount - retries} attempts left)
                </button>
              )}
            </div>
          </div>
        ))}
    </div>
  );
};

// Mock content loading function (replace with actual implementation)
async function loadContent(): Promise<void> {
  return new Promise((resolve, reject) => {
    // Simulate network delay
    const delay = Math.random() * 2000 + 500;

    setTimeout(() => {
      // 90% success rate
      if (Math.random() > 0.1) {
        resolve();
      } else {
        reject(new Error('Failed to load content'));
      }
    }, delay);
  });
}

// Performance monitoring (replace with actual analytics)
function reportLoadTime(loadTime: number, priority: string, networkType: string): void {
  // Send to analytics service
  console.log('Content load time:', {
    loadTime,
    priority,
    networkType,
    timestamp: Date.now(),
  });
}
```

### 4. Responsive Grid with Container Queries (`ResponsiveVideoGrid`)

**Philosophy**: Grid layouts should adapt to their container context rather than just viewport size.

```css
/* /frontend/src/components/VideoGrid/ResponsiveVideoGrid.css */

/* === CONTAINER-AWARE VIDEO GRID === */

.responsive-video-grid {
  container-type: inline-size;
  container-name: video-grid;
  width: 100%;
  padding: var(--spacing-md);
}

/* Grid foundation with CSS Grid and Container Queries */
.video-grid__responsive {
  display: grid;
  gap: var(--grid-gap);
  grid-template-columns: repeat(var(--grid-columns), minmax(0, 1fr));

  /* Default mobile-first values */
  --grid-columns: 1;
  --grid-gap: var(--spacing-sm);
  --card-aspect-ratio: 16 / 9;
  --card-min-width: 280px;
}

/* Container query breakpoints for adaptive columns */
@container video-grid (min-width: 320px) {
  .video-grid__responsive {
    --grid-columns: 1;
    --grid-gap: var(--spacing-sm);
    --card-min-width: 100%;
  }
}

@container video-grid (min-width: 640px) {
  .video-grid__responsive {
    --grid-columns: 2;
    --grid-gap: var(--spacing-md);
    --card-min-width: 280px;
  }
}

@container video-grid (min-width: 900px) {
  .video-grid__responsive {
    --grid-columns: 3;
    --grid-gap: var(--spacing-md);
    --card-min-width: 260px;
  }
}

@container video-grid (min-width: 1200px) {
  .video-grid__responsive {
    --grid-columns: 4;
    --grid-gap: var(--spacing-lg);
    --card-min-width: 240px;
  }
}

@container video-grid (min-width: 1500px) {
  .video-grid__responsive {
    --grid-columns: 5;
    --grid-gap: var(--spacing-lg);
    --card-min-width: 220px;
  }
}

/* Responsive video cards within the grid */
.video-card--responsive {
  min-width: var(--card-min-width);
  aspect-ratio: var(--card-aspect-ratio);
  position: relative;
  overflow: hidden;
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  transition: transform var(--transition-normal);

  /* Touch optimization */
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}

/* Touch device optimizations */
@media (hover: none) and (pointer: coarse) {
  .video-card--responsive {
    /* Larger touch targets on mobile */
    min-height: 60px;

    /* Remove hover effects, add active states */
    transition: transform 0.1s ease;
  }

  .video-card--responsive:active {
    transform: scale(0.98);
  }

  /* Show metadata by default on touch devices */
  .video-card__metadata {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Dense layout for larger screens */
@container video-grid (min-width: 1200px) {
  .video-grid__responsive[data-layout='dense'] {
    --grid-columns: 6;
    --card-aspect-ratio: 3 / 4; /* Portrait orientation for more items */
  }
}

/* List layout option for narrow containers */
@container video-grid (max-width: 500px) {
  .video-grid__responsive[data-layout='list'] {
    --grid-columns: 1;
    --card-aspect-ratio: 16 / 6; /* Wide aspect for list items */
  }

  .video-card--responsive {
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    aspect-ratio: auto;
    min-height: 80px;
    padding: var(--spacing-sm);
  }
}

/* === PROGRESSIVE ENHANCEMENT === */

/* Base layout without Container Queries support */
@supports not (container-type: inline-size) {
  .video-grid__responsive {
    /* Fallback to flexbox with media queries */
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-md);
  }

  .video-card--responsive {
    flex: 1 1 300px;
    max-width: calc(50% - var(--spacing-md) / 2);
  }

  @media (max-width: 640px) {
    .video-card--responsive {
      flex: 1 1 100%;
      max-width: 100%;
    }
  }

  @media (min-width: 1200px) {
    .video-card--responsive {
      flex: 1 1 250px;
      max-width: calc(25% - var(--spacing-md) * 3 / 4);
    }
  }
}

/* === PERFORMANCE OPTIMIZATIONS === */

/* Optimize rendering for mobile devices */
@media (max-width: 640px) {
  .video-grid__responsive {
    /* Optimize for mobile scrolling */
    will-change: scroll-position;
    -webkit-overflow-scrolling: touch;
  }

  .video-card--responsive {
    /* Reduce paint complexity on mobile */
    will-change: transform;
    backface-visibility: hidden;
    -webkit-font-smoothing: antialiased;
  }

  /* Simplify shadows on mobile for performance */
  .video-card--responsive:hover,
  .video-card--responsive:focus-visible {
    box-shadow: var(--shadow-sm);
  }
}

/* High DPI display optimizations */
@media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) {
  .video-card--responsive {
    /* Crisper rendering on high DPI */
    -webkit-font-smoothing: subpixel-antialiased;
  }
}

/* Reduce motion on user preference */
@media (prefers-reduced-motion: reduce) {
  .video-card--responsive,
  .video-grid__responsive {
    transition: none;
    animation: none;
  }
}

/* Print styles */
@media print {
  .video-grid__responsive {
    display: block;
    columns: 2;
    column-gap: var(--spacing-lg);
  }

  .video-card--responsive {
    break-inside: avoid;
    margin-bottom: var(--spacing-md);
  }
}
```

### 5. Offline-First Architecture (`OfflineSupport`)

**Philosophy**: Core functionality should work offline, with graceful degradation for network-dependent features.

```tsx
// /frontend/src/hooks/useOfflineSupport.ts
import { useState, useEffect, useCallback } from 'react';
import { useServiceWorker } from './useServiceWorker';

interface OfflineState {
  isOnline: boolean;
  isOfflineReady: boolean;
  pendingActions: OfflineAction[];
  cachedContent: CachedContent[];
  syncStatus: 'idle' | 'syncing' | 'error';
}

interface OfflineAction {
  id: string;
  type: string;
  data: any;
  timestamp: number;
  retryCount: number;
}

interface CachedContent {
  id: string;
  type: 'video' | 'thumbnail' | 'metadata';
  url: string;
  cachedAt: number;
  expiresAt: number;
}

export function useOfflineSupport() {
  const [state, setState] = useState<OfflineState>({
    isOnline: navigator.onLine,
    isOfflineReady: false,
    pendingActions: [],
    cachedContent: [],
    syncStatus: 'idle',
  });

  const { isServiceWorkerReady, updateAvailable } = useServiceWorker();

  // Network status monitoring
  useEffect(() => {
    const handleOnline = () => {
      setState(prev => ({ ...prev, isOnline: true }));
      syncPendingActions();
    };

    const handleOffline = () => {
      setState(prev => ({ ...prev, isOnline: false }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Initialize offline support
  useEffect(() => {
    if (isServiceWorkerReady) {
      setState(prev => ({ ...prev, isOfflineReady: true }));
      loadCachedContent();
      loadPendingActions();
    }
  }, [isServiceWorkerReady]);

  // Queue actions for offline execution
  const queueAction = useCallback(
    async (action: Omit<OfflineAction, 'id' | 'timestamp' | 'retryCount'>) => {
      const offlineAction: OfflineAction = {
        ...action,
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        retryCount: 0,
      };

      // Try immediate execution if online
      if (state.isOnline) {
        try {
          await executeAction(offlineAction);
          return;
        } catch (error) {
          console.warn('Action failed, queuing for later:', error);
        }
      }

      // Store for later execution
      const updatedActions = [...state.pendingActions, offlineAction];
      setState(prev => ({ ...prev, pendingActions: updatedActions }));

      // Persist to localStorage
      localStorage.setItem('sofathek-pending-actions', JSON.stringify(updatedActions));
    },
    [state.isOnline, state.pendingActions]
  );

  // Execute pending actions when back online
  const syncPendingActions = useCallback(async () => {
    if (!state.isOnline || state.pendingActions.length === 0) return;

    setState(prev => ({ ...prev, syncStatus: 'syncing' }));

    const results = await Promise.allSettled(state.pendingActions.map(executeAction));

    const failed = results
      .map((result, index) => ({ result, action: state.pendingActions[index] }))
      .filter(({ result }) => result.status === 'rejected')
      .map(({ action }) => ({ ...action, retryCount: action.retryCount + 1 }))
      .filter(action => action.retryCount < 3); // Max 3 retries

    setState(prev => ({
      ...prev,
      pendingActions: failed,
      syncStatus: failed.length > 0 ? 'error' : 'idle',
    }));

    // Update localStorage
    localStorage.setItem('sofathek-pending-actions', JSON.stringify(failed));
  }, [state.isOnline, state.pendingActions]);

  // Cache content for offline access
  const cacheContent = useCallback(
    async (content: Omit<CachedContent, 'cachedAt'>) => {
      try {
        const cache = await caches.open('sofathek-content-v1');
        await cache.add(content.url);

        const cachedContent: CachedContent = {
          ...content,
          cachedAt: Date.now(),
        };

        setState(prev => ({
          ...prev,
          cachedContent: [...prev.cachedContent, cachedContent],
        }));

        // Persist cache metadata
        const metadata = [...state.cachedContent, cachedContent];
        localStorage.setItem('sofathek-cached-content', JSON.stringify(metadata));
      } catch (error) {
        console.error('Failed to cache content:', error);
      }
    },
    [state.cachedContent]
  );

  // Check if content is available offline
  const isContentCached = useCallback(
    (url: string): boolean => {
      return state.cachedContent.some(content => content.url === url && content.expiresAt > Date.now());
    },
    [state.cachedContent]
  );

  // Load cached content metadata from localStorage
  const loadCachedContent = useCallback(() => {
    try {
      const cached = localStorage.getItem('sofathek-cached-content');
      if (cached) {
        const parsedCache = JSON.parse(cached) as CachedContent[];
        const validCache = parsedCache.filter(content => content.expiresAt > Date.now());

        setState(prev => ({ ...prev, cachedContent: validCache }));

        if (validCache.length !== parsedCache.length) {
          localStorage.setItem('sofathek-cached-content', JSON.stringify(validCache));
        }
      }
    } catch (error) {
      console.error('Failed to load cached content metadata:', error);
    }
  }, []);

  // Load pending actions from localStorage
  const loadPendingActions = useCallback(() => {
    try {
      const pending = localStorage.getItem('sofathek-pending-actions');
      if (pending) {
        const parsedActions = JSON.parse(pending) as OfflineAction[];
        setState(prev => ({ ...prev, pendingActions: parsedActions }));
      }
    } catch (error) {
      console.error('Failed to load pending actions:', error);
    }
  }, []);

  return {
    ...state,
    queueAction,
    cacheContent,
    isContentCached,
    syncPendingActions,
    updateAvailable,
  };
}

// Execute offline action
async function executeAction(action: OfflineAction): Promise<void> {
  switch (action.type) {
    case 'ADD_TO_WATCHLIST':
      await fetch(`/api/watchlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action.data),
      });
      break;

    case 'RATE_VIDEO':
      await fetch(`/api/videos/${action.data.videoId}/rating`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: action.data.rating }),
      });
      break;

    case 'UPDATE_PROGRESS':
      await fetch(`/api/videos/${action.data.videoId}/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          progress: action.data.progress,
          timestamp: action.data.timestamp,
        }),
      });
      break;

    default:
      throw new Error(`Unknown action type: ${action.type}`);
  }
}
```

---

## Anti-Patterns to Avoid

❌ **Desktop-First Responsive**: Don't start with desktop layouts and scale down to mobile

- **Why bad**: Results in cramped mobile experiences with poor touch interactions
- **Better**: Start with mobile constraints, progressively enhance for larger screens

❌ **Viewport-Only Responsive Design**: Don't rely solely on viewport media queries for responsive behavior

- **Why bad**: Components can't adapt when used in sidebars, modals, or varying containers
- **Better**: Use Container Queries as primary responsive mechanism with viewport fallbacks

❌ **Hover-Dependent Interactions**: Don't design critical functionality that requires hover states

- **Why bad**: Touch devices don't support hover, creating unusable interfaces
- **Better**: Design for touch-first with hover as progressive enhancement

❌ **Tiny Touch Targets**: Don't create buttons or links smaller than 44px on any dimension

- **Why bad**: Violates accessibility guidelines and creates frustrating mobile experience
- **Better**: Ensure all interactive elements meet minimum touch target sizes

❌ **Network-Assumption Design**: Don't assume fast, stable internet connections for core functionality

- **Why bad**: Excludes users on slower connections or intermittent connectivity
- **Better**: Progressive loading with offline fallbacks and graceful degradation

---

## Variation Guidance

**IMPORTANT**: Mobile-first implementations should vary based on device capabilities and user context.

**Vary by Device Class**:

- **Low-End Devices**: Simplified layouts, reduced animations, aggressive caching
- **Mid-Range Devices**: Standard responsive behavior with performance optimizations
- **High-End Devices**: Enhanced interactions, smooth animations, advanced features
- **Tablet Devices**: Hybrid touch/pointer interactions, optimized for larger touch screens

**Vary by Network Conditions**:

- **Slow Networks (2G)**: Text-first loading, minimal images, aggressive compression
- **Fast Networks (5G)**: Rich media, background preloading, high-quality assets
- **Unstable Networks**: Offline-first approach with sync capabilities
- **Metered Connections**: Data-conscious loading with user control over quality

**Vary by Usage Context**:

- **Commuting/Mobile**: Simplified navigation, downloadable content, offline support
- **Home/Wi-Fi**: Full features, streaming quality, family profile switching
- **TVs/Casting**: Living room UI patterns, large text, simple remote navigation
- **Accessibility Needs**: Enhanced contrast, larger touch targets, screen reader optimization

**Avoid converging on single mobile-web-app approach** - adapt the interface paradigms to match how families actually consume media across different devices and contexts.

---

## Remember

**Mobile-first design is not just about smaller screens - it's about designing for human limitations and real-world usage patterns.**

The best mobile-first experiences:

- Prioritize thumb-reachable interactions and clear visual hierarchy
- Load progressively without sacrificing perceived performance
- Work reliably across network conditions and device capabilities
- Feel native to each platform while maintaining brand consistency

**This mobile-first framework ensures SOFATHEK provides excellent user experience across all devices while maintaining the premium feel of modern streaming services.**
