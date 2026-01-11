# PRP-3.2: Responsive Video Grid & Card System

## Purpose & Core Philosophy

**Transform static video display into engaging, responsive Netflix-like content discovery interface that adapts fluidly across devices while maintaining visual hierarchy and user engagement.**

### Before designing video grids, ask:

- **Does this grid layout guide user attention toward high-quality content?**
- **How does the card design encourage content exploration without overwhelming?**
- **Will this grid perform smoothly with hundreds of videos across all devices?**
- **Does the visual hierarchy help users make quick content decisions?**

### Core Principles

1. **Progressive Visual Disclosure**: Cards reveal information progressively through interaction (hover, focus, tap)
2. **Performance-First Responsiveness**: Grid adapts using Container Queries and CSS Grid for optimal performance
3. **Content Hierarchy**: Visual design emphasizes video quality, recency, and user engagement metrics
4. **Accessibility-Driven Interaction**: All grid interactions work with keyboard, screen readers, and touch

---

## Gap Analysis: Current vs Netflix-Like Grid Experience

### Current State Issues

- **Basic CSS Grid**: Fixed columns without Container Query responsiveness
- **Static Cards**: No hover states, progressive disclosure, or engagement indicators
- **Performance Blind**: No lazy loading, virtualization, or loading state optimization
- **Limited Metadata**: Cards don't surface rich video information or user-specific data
- **Generic Styling**: Cards lack Netflix-like polish, animation, and visual hierarchy
- **No Progressive Enhancement**: Grid requires JavaScript instead of working with CSS-first approach
- **Missing Accessibility**: Limited keyboard navigation and screen reader support

### Netflix-Like Target Experience

- **Fluid Container-Based Grid**: Columns adapt to container width using Container Queries
- **Rich Hover States**: Cards expand with additional metadata, preview thumbnails, action buttons
- **Smart Loading**: Lazy loading with intersection observer, skeleton states during loading
- **Engagement Indicators**: Progress bars, watch history, new content badges, ratings
- **Smooth Animations**: Micro-interactions that feel premium without being distracting
- **Keyboard Navigation**: Full keyboard support with focus management and shortcuts
- **Touch Optimization**: Touch-friendly targets and gestures for mobile interaction

---

## Implementation Strategy

### 1. Advanced Container Query Grid System (`VideoGrid`)

**Philosophy**: Grid should be container-aware, not viewport-aware, allowing embedding in any layout context.

```tsx
// /frontend/src/components/VideoGrid/VideoGrid.tsx
import React, { memo, useCallback, useRef, useEffect, useState } from 'react';
import { useIntersectionObserver, useVirtualization } from '../../hooks';
import { Video, GridDisplayOptions } from '../../types';
import { VideoCard } from './VideoCard';
import { GridSkeleton } from './GridSkeleton';
import { GridEmpty } from './GridEmpty';
import './VideoGrid.css';

interface VideoGridProps {
  videos: Video[];
  loading?: boolean;
  error?: string;
  onVideoClick?: (video: Video) => void;
  onVideoHover?: (video: Video | null) => void;
  displayOptions?: GridDisplayOptions;
  className?: string;
  emptyMessage?: string;
  enableVirtualization?: boolean;
  loadMoreThreshold?: number;
  onLoadMore?: () => void;
  hasMoreContent?: boolean;
}

interface GridDisplayOptions {
  cardSize: 'compact' | 'standard' | 'large' | 'hero';
  showMetadata: boolean;
  showProgress: boolean;
  showQuality: boolean;
  showDuration: boolean;
  showNewBadge: boolean;
  aspectRatio: '16/9' | '4/3' | '3/4' | 'auto';
  maxColumns?: number;
  minColumnWidth?: number;
  gap?: 'tight' | 'normal' | 'loose';
}

export const VideoGrid = memo<VideoGridProps>(
  ({
    videos,
    loading = false,
    error,
    onVideoClick,
    onVideoHover,
    displayOptions = {
      cardSize: 'standard',
      showMetadata: true,
      showProgress: true,
      showQuality: true,
      showDuration: true,
      showNewBadge: true,
      aspectRatio: '16/9',
      minColumnWidth: 280,
      gap: 'normal',
    },
    className = '',
    emptyMessage = 'No videos found',
    enableVirtualization = false,
    loadMoreThreshold = 500,
    onLoadMore,
    hasMoreContent = false,
  }) => {
    const gridRef = useRef<HTMLDivElement>(null);
    const [hoveredVideoId, setHoveredVideoId] = useState<string | null>(null);
    const [focusedVideoId, setFocusedVideoId] = useState<string | null>(null);

    // Virtualization for large collections
    const virtualizedItems = useVirtualization(
      videos,
      enableVirtualization
        ? {
            containerRef: gridRef,
            itemHeight: displayOptions.cardSize === 'compact' ? 200 : displayOptions.cardSize === 'large' ? 400 : 300,
            overscan: 5,
          }
        : null
    );

    // Infinite scroll detection
    const [loadMoreElement, loadMoreInView] = useIntersectionObserver({
      threshold: 0.1,
      rootMargin: `${loadMoreThreshold}px`,
    });

    useEffect(() => {
      if (loadMoreInView && hasMoreContent && onLoadMore && !loading) {
        onLoadMore();
      }
    }, [loadMoreInView, hasMoreContent, onLoadMore, loading]);

    // Keyboard navigation
    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        if (!videos.length) return;

        const currentIndex = videos.findIndex(v => v.id === focusedVideoId);
        let nextIndex = currentIndex;

        const gridContainer = gridRef.current;
        if (!gridContainer) return;

        // Get computed grid columns
        const computedStyle = window.getComputedStyle(gridContainer.querySelector('.video-grid__container')!);
        const columnCount = computedStyle.getPropertyValue('grid-template-columns').split(' ').length;

        switch (e.key) {
          case 'ArrowRight':
            nextIndex = currentIndex < videos.length - 1 ? currentIndex + 1 : currentIndex;
            break;
          case 'ArrowLeft':
            nextIndex = currentIndex > 0 ? currentIndex - 1 : currentIndex;
            break;
          case 'ArrowDown':
            nextIndex = currentIndex + columnCount < videos.length ? currentIndex + columnCount : currentIndex;
            break;
          case 'ArrowUp':
            nextIndex = currentIndex - columnCount >= 0 ? currentIndex - columnCount : currentIndex;
            break;
          case 'Enter':
          case ' ':
            if (currentIndex >= 0 && onVideoClick) {
              e.preventDefault();
              onVideoClick(videos[currentIndex]);
            }
            return;
          default:
            return;
        }

        if (nextIndex !== currentIndex) {
          e.preventDefault();
          setFocusedVideoId(videos[nextIndex].id);

          // Scroll focused item into view
          const focusedElement = gridContainer.querySelector(`[data-video-id="${videos[nextIndex].id}"]`);
          focusedElement?.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
            inline: 'nearest',
          });
        }
      },
      [videos, focusedVideoId, onVideoClick]
    );

    const handleVideoHover = useCallback(
      (video: Video | null) => {
        setHoveredVideoId(video?.id || null);
        onVideoHover?.(video);
      },
      [onVideoHover]
    );

    const handleVideoFocus = useCallback((video: Video) => {
      setFocusedVideoId(video.id);
    }, []);

    const renderVideos = enableVirtualization ? virtualizedItems : videos;

    if (error) {
      return (
        <div className={`video-grid ${className}`}>
          <div className="video-grid__error">
            <svg className="error-icon" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <h3>Unable to load videos</h3>
            <p>{error}</p>
            <button className="error-retry" onClick={() => window.location.reload()}>
              Retry
            </button>
          </div>
        </div>
      );
    }

    if (loading && videos.length === 0) {
      return (
        <div className={`video-grid ${className}`}>
          <GridSkeleton displayOptions={displayOptions} count={12} />
        </div>
      );
    }

    if (videos.length === 0 && !loading) {
      return (
        <div className={`video-grid ${className}`}>
          <GridEmpty message={emptyMessage} />
        </div>
      );
    }

    return (
      <div
        className={`video-grid ${className}`}
        ref={gridRef}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="grid"
        aria-label="Video library grid"
        data-display-size={displayOptions.cardSize}
        data-display-gap={displayOptions.gap}
      >
        <div
          className="video-grid__container"
          style={
            {
              '--grid-min-column-width': displayOptions.minColumnWidth
                ? `${displayOptions.minColumnWidth}px`
                : undefined,
              '--grid-max-columns': displayOptions.maxColumns || undefined,
              '--grid-aspect-ratio': displayOptions.aspectRatio,
            } as React.CSSProperties
          }
        >
          {renderVideos.map((video, index) => (
            <VideoCard
              key={video.id}
              video={video}
              displayOptions={displayOptions}
              onClick={onVideoClick}
              onHover={handleVideoHover}
              onFocus={handleVideoFocus}
              isHovered={hoveredVideoId === video.id}
              isFocused={focusedVideoId === video.id}
              gridIndex={index}
              data-video-id={video.id}
            />
          ))}
        </div>

        {/* Loading more indicator */}
        {hasMoreContent && (
          <div ref={loadMoreElement} className="video-grid__load-more" aria-hidden="true">
            {loading && (
              <div className="load-more-spinner">
                <div className="spinner"></div>
                <span>Loading more videos...</span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
);

VideoGrid.displayName = 'VideoGrid';
```

### 2. Enhanced Video Card with Progressive Disclosure (`VideoCard`)

**Philosophy**: Cards should reveal information progressively, balancing immediate recognition with detailed exploration.

```tsx
// /frontend/src/components/VideoGrid/VideoCard.tsx
import React, { memo, useState, useRef, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Video, GridDisplayOptions } from '../../types';
import { useImagePreloader, useHoverDelay, useWatchProgress } from '../../hooks';
import { VideoCardActions } from './VideoCardActions';
import { VideoCardMetadata } from './VideoCardMetadata';
import { VideoCardThumbnail } from './VideoCardThumbnail';
import './VideoCard.css';

interface VideoCardProps {
  video: Video;
  displayOptions: GridDisplayOptions;
  onClick?: (video: Video) => void;
  onHover?: (video: Video | null) => void;
  onFocus?: (video: Video) => void;
  isHovered?: boolean;
  isFocused?: boolean;
  gridIndex?: number;
  className?: string;
}

export const VideoCard = memo<VideoCardProps>(
  ({
    video,
    displayOptions,
    onClick,
    onHover,
    onFocus,
    isHovered = false,
    isFocused = false,
    gridIndex = 0,
    className = '',
  }) => {
    const cardRef = useRef<HTMLDivElement>(null);
    const [isImageLoaded, setIsImageLoaded] = useState(false);
    const [isImageError, setIsImageError] = useState(false);
    const [showPreview, setShowPreview] = useState(false);

    const { watchProgress } = useWatchProgress(video.id);

    // Preload high-quality thumbnail on hover
    const { preloadImage } = useImagePreloader();

    // Delayed hover for preview content
    const { isDelayedHover, startHover, endHover } = useHoverDelay(800);

    useEffect(() => {
      if (isDelayedHover && video.previewThumbnails?.length) {
        setShowPreview(true);
        // Preload preview images
        video.previewThumbnails.forEach(thumb => preloadImage(thumb));
      } else {
        setShowPreview(false);
      }
    }, [isDelayedHover, video.previewThumbnails, preloadImage]);

    const handleMouseEnter = useCallback(() => {
      onHover?.(video);
      startHover();
      // Preload high-quality thumbnail
      if (video.thumbnailHd) {
        preloadImage(video.thumbnailHd);
      }
    }, [onHover, video, startHover, preloadImage]);

    const handleMouseLeave = useCallback(() => {
      onHover?.(null);
      endHover();
    }, [onHover, endHover]);

    const handleFocus = useCallback(() => {
      onFocus?.(video);
    }, [onFocus, video]);

    const handleClick = useCallback(
      (e: React.MouseEvent) => {
        if (onClick) {
          e.preventDefault();
          onClick(video);
        }
      },
      [onClick, video]
    );

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.(video);
        }
      },
      [onClick, video]
    );

    const cardClasses = [
      'video-card',
      `video-card--${displayOptions.cardSize}`,
      isHovered && 'video-card--hovered',
      isFocused && 'video-card--focused',
      isImageLoaded && 'video-card--image-loaded',
      showPreview && 'video-card--preview-active',
      video.isNew && 'video-card--new',
      watchProgress && watchProgress > 0 && 'video-card--in-progress',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    const cardStyle = {
      '--aspect-ratio': displayOptions.aspectRatio,
      '--animation-delay': `${gridIndex * 50}ms`,
    } as React.CSSProperties;

    return (
      <div
        ref={cardRef}
        className={cardClasses}
        style={cardStyle}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleFocus}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="gridcell"
        aria-label={`${video.title} - ${video.duration ? formatDuration(video.duration) : 'Duration unknown'}`}
        data-video-id={video.id}
      >
        {/* Thumbnail Container */}
        <div className="video-card__thumbnail-container">
          <VideoCardThumbnail
            video={video}
            isImageLoaded={isImageLoaded}
            isImageError={isImageError}
            showPreview={showPreview}
            onImageLoad={() => setIsImageLoaded(true)}
            onImageError={() => setIsImageError(true)}
            displayOptions={displayOptions}
          />

          {/* Progress Bar */}
          {displayOptions.showProgress && watchProgress && watchProgress > 0 && (
            <div className="video-card__progress">
              <div
                className="progress-bar"
                style={{ width: `${(watchProgress / video.duration!) * 100}%` }}
                aria-label={`Watched ${Math.round((watchProgress / video.duration!) * 100)}%`}
              />
            </div>
          )}

          {/* Overlay Badges */}
          <div className="video-card__badges">
            {displayOptions.showDuration && video.duration && (
              <div className="badge badge--duration">{formatDuration(video.duration)}</div>
            )}

            {displayOptions.showQuality && video.quality && <div className="badge badge--quality">{video.quality}</div>}

            {displayOptions.showNewBadge && video.isNew && <div className="badge badge--new">NEW</div>}
          </div>

          {/* Hover Actions */}
          {(isHovered || isFocused) && (
            <VideoCardActions video={video} onPlay={() => onClick?.(video)} className="video-card__actions" />
          )}
        </div>

        {/* Metadata Section */}
        {displayOptions.showMetadata && (
          <VideoCardMetadata
            video={video}
            displayOptions={displayOptions}
            isExpanded={isHovered || isFocused}
            className="video-card__metadata"
          />
        )}

        {/* Focus Ring */}
        <div className="video-card__focus-ring" aria-hidden="true" />
      </div>
    );
  }
);

VideoCard.displayName = 'VideoCard';

// Utility function
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}
```

### 3. Advanced Thumbnail Component with Preview (`VideoCardThumbnail`)

**Philosophy**: Thumbnails should load progressively, provide visual feedback, and support preview functionality.

```tsx
// /frontend/src/components/VideoGrid/VideoCardThumbnail.tsx
import React, { memo, useState, useEffect, useRef } from 'react';
import { Video, GridDisplayOptions } from '../../types';
import { useIntersectionObserver } from '../../hooks';
import './VideoCardThumbnail.css';

interface VideoCardThumbnailProps {
  video: Video;
  isImageLoaded: boolean;
  isImageError: boolean;
  showPreview: boolean;
  onImageLoad: () => void;
  onImageError: () => void;
  displayOptions: GridDisplayOptions;
  className?: string;
}

export const VideoCardThumbnail = memo<VideoCardThumbnailProps>(
  ({ video, isImageLoaded, isImageError, showPreview, onImageLoad, onImageError, displayOptions, className = '' }) => {
    const [previewIndex, setPreviewIndex] = useState(0);
    const [shouldLoad, setShouldLoad] = useState(false);
    const thumbnailRef = useRef<HTMLDivElement>(null);
    const previewTimerRef = useRef<NodeJS.Timeout>();

    // Lazy loading with intersection observer
    const [intersectionRef, isIntersecting] = useIntersectionObserver({
      threshold: 0.1,
      rootMargin: '50px',
    });

    useEffect(() => {
      if (isIntersecting) {
        setShouldLoad(true);
      }
    }, [isIntersecting]);

    // Preview image cycling
    useEffect(() => {
      if (showPreview && video.previewThumbnails?.length) {
        const cyclePreview = () => {
          setPreviewIndex(prev => (prev + 1) % video.previewThumbnails!.length);
        };

        previewTimerRef.current = setInterval(cyclePreview, 1000);

        return () => {
          if (previewTimerRef.current) {
            clearInterval(previewTimerRef.current);
          }
        };
      } else {
        setPreviewIndex(0);
      }
    }, [showPreview, video.previewThumbnails]);

    const thumbnailSrc = shouldLoad
      ? showPreview && video.previewThumbnails?.[previewIndex]
        ? video.previewThumbnails[previewIndex]
        : video.thumbnailHd || video.thumbnail
      : undefined;

    const fallbackSrc = video.thumbnail;

    return (
      <div ref={intersectionRef} className={`video-thumbnail ${className}`}>
        <div className="thumbnail-container" ref={thumbnailRef}>
          {/* Main thumbnail/preview */}
          {shouldLoad && (
            <img
              src={thumbnailSrc}
              alt={video.title}
              className={`thumbnail-image ${isImageLoaded ? 'thumbnail-image--loaded' : ''} ${showPreview ? 'thumbnail-image--preview' : ''}`}
              onLoad={onImageLoad}
              onError={e => {
                // Fallback to standard thumbnail
                if (e.currentTarget.src !== fallbackSrc) {
                  e.currentTarget.src = fallbackSrc;
                } else {
                  onImageError();
                }
              }}
              loading="lazy"
              decoding="async"
            />
          )}

          {/* Loading skeleton */}
          {!isImageLoaded && shouldLoad && (
            <div className="thumbnail-skeleton">
              <div className="skeleton-shimmer"></div>
            </div>
          )}

          {/* Error state */}
          {isImageError && (
            <div className="thumbnail-error">
              <svg className="error-icon" viewBox="0 0 24 24">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21,15 16,10 5,21" />
              </svg>
              <span className="error-text">Image unavailable</span>
            </div>
          )}

          {/* Preview indicator */}
          {showPreview && video.previewThumbnails?.length && (
            <div className="preview-indicator">
              <div className="preview-dots">
                {video.previewThumbnails.map((_, index) => (
                  <div key={index} className={`preview-dot ${index === previewIndex ? 'preview-dot--active' : ''}`} />
                ))}
              </div>
            </div>
          )}

          {/* Gradient overlay for text readability */}
          <div className="thumbnail-overlay" />
        </div>
      </div>
    );
  }
);

VideoCardThumbnail.displayName = 'VideoCardThumbnail';
```

### 4. Container Queries CSS Grid System

**Philosophy**: Responsive behavior should be container-based, not viewport-based, enabling flexible embedding.

```css
/* /frontend/src/components/VideoGrid/VideoGrid.css */

/* Container Queries for responsive grid */
.video-grid {
  container-type: inline-size;
  container-name: video-grid;
  width: 100%;
}

.video-grid__container {
  display: grid;
  grid-template-columns: repeat(
    auto-fit,
    minmax(
      max(
        var(--grid-min-column-width, 280px),
        calc((100% - var(--grid-gap, 1rem) * (var(--grid-max-columns, 6) - 1)) / var(--grid-max-columns, 6))
      ),
      1fr
    )
  );
  gap: var(--grid-gap, 1rem);
  padding: var(--grid-padding, 0);

  /* Gap variations */
  &[data-display-gap='tight'] {
    --grid-gap: 0.5rem;
  }

  &[data-display-gap='loose'] {
    --grid-gap: 2rem;
  }
}

/* Container query breakpoints */
@container video-grid (max-width: 640px) {
  .video-grid__container {
    --grid-min-column-width: 240px;
    --grid-max-columns: 2;
    --grid-gap: 0.75rem;
  }
}

@container video-grid (min-width: 641px) and (max-width: 1024px) {
  .video-grid__container {
    --grid-min-column-width: 260px;
    --grid-max-columns: 3;
  }
}

@container video-grid (min-width: 1025px) and (max-width: 1440px) {
  .video-grid__container {
    --grid-min-column-width: 280px;
    --grid-max-columns: 4;
  }
}

@container video-grid (min-width: 1441px) {
  .video-grid__container {
    --grid-min-column-width: 300px;
    --grid-max-columns: 5;
  }
}

/* Video Card Base Styles */
.video-card {
  position: relative;
  display: flex;
  flex-direction: column;
  border-radius: var(--radius-lg);
  overflow: hidden;
  background: var(--color-surface);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  outline: none;

  /* Staggered entrance animation */
  animation: cardEntranceStagger 0.6s cubic-bezier(0.4, 0, 0.2, 1) both;
  animation-delay: var(--animation-delay, 0ms);
}

@keyframes cardEntranceStagger {
  from {
    opacity: 0;
    transform: translateY(1rem) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* Card Size Variations */
.video-card--compact .video-card__thumbnail-container {
  aspect-ratio: 16 / 9;
}

.video-card--standard .video-card__thumbnail-container {
  aspect-ratio: var(--aspect-ratio, 16 / 9);
}

.video-card--large .video-card__thumbnail-container {
  aspect-ratio: 16 / 10;
}

.video-card--hero .video-card__thumbnail-container {
  aspect-ratio: 21 / 9;
}

/* Hover and Focus States */
.video-card:hover,
.video-card--hovered {
  transform: translateY(-0.25rem) scale(1.02);
  box-shadow:
    0 8px 25px rgba(0, 0, 0, 0.15),
    0 4px 10px rgba(0, 0, 0, 0.1);
  z-index: 10;
}

.video-card:focus-visible,
.video-card--focused {
  transform: translateY(-0.25rem);
  z-index: 10;
}

.video-card__focus-ring {
  position: absolute;
  inset: -2px;
  border: 2px solid var(--color-primary);
  border-radius: calc(var(--radius-lg) + 2px);
  opacity: 0;
  transition: opacity 0.2s ease;
  pointer-events: none;
}

.video-card:focus-visible .video-card__focus-ring,
.video-card--focused .video-card__focus-ring {
  opacity: 1;
}

/* Thumbnail Container */
.video-card__thumbnail-container {
  position: relative;
  overflow: hidden;
  background: var(--color-surface-variant);
  border-radius: var(--radius-md);
}

/* Progress Bar */
.video-card__progress {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: rgba(0, 0, 0, 0.3);
  z-index: 20;
}

.progress-bar {
  height: 100%;
  background: var(--color-primary);
  transition: width 0.3s ease;
  border-radius: 0 1px 1px 0;
}

/* Badges */
.video-card__badges {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  z-index: 20;
}

.badge {
  padding: 0.25rem 0.5rem;
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  font-weight: 600;
  line-height: 1;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.badge--duration {
  background: rgba(0, 0, 0, 0.8);
  color: white;
}

.badge--quality {
  background: rgba(var(--color-primary-rgb), 0.9);
  color: white;
}

.badge--new {
  background: var(--color-accent);
  color: white;
  animation: pulseNew 2s infinite;
}

@keyframes pulseNew {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

/* Actions Overlay */
.video-card__actions {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(2px);
  opacity: 0;
  transition: opacity 0.3s ease;
  z-index: 30;
}

.video-card:hover .video-card__actions,
.video-card--hovered .video-card__actions,
.video-card:focus-visible .video-card__actions,
.video-card--focused .video-card__actions {
  opacity: 1;
}

/* Metadata Section */
.video-card__metadata {
  padding: 0.75rem;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-height: 0;
}

.video-card--compact .video-card__metadata {
  padding: 0.5rem;
}

.video-card--large .video-card__metadata {
  padding: 1rem;
}

/* Loading and Error States */
.video-grid__error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  text-align: center;
  color: var(--color-text-secondary);
}

.error-icon {
  width: 3rem;
  height: 3rem;
  margin-bottom: 1rem;
  stroke: var(--color-error);
}

.error-retry {
  margin-top: 1rem;
  padding: 0.5rem 1rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--color-text);
  cursor: pointer;
  transition: all 0.2s ease;
}

.error-retry:hover {
  background: var(--color-surface-variant);
  border-color: var(--color-primary);
}

/* Load More Indicator */
.video-grid__load-more {
  display: flex;
  justify-content: center;
  padding: 2rem;
  margin-top: 1rem;
}

.load-more-spinner {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: var(--color-text-secondary);
}

.spinner {
  width: 1.5rem;
  height: 1.5rem;
  border: 2px solid transparent;
  border-top: 2px solid var(--color-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Performance Optimizations */

/* Reduce animations on low-end devices */
@media (prefers-reduced-motion: reduce) {
  .video-card,
  .video-card:hover,
  .video-card--hovered,
  .progress-bar,
  .badge--new {
    animation: none;
    transition: none;
  }

  .video-card:hover,
  .video-card--hovered {
    transform: none;
  }
}

/* GPU acceleration for animations */
.video-card,
.video-card__actions,
.progress-bar {
  will-change: transform, opacity;
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  .video-card {
    border: 2px solid var(--color-border);
  }

  .video-card:focus-visible,
  .video-card--focused {
    border-color: var(--color-primary);
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }

  .badge {
    border: 1px solid var(--color-border);
  }
}

/* Print styles */
@media print {
  .video-grid {
    display: block;
  }

  .video-card {
    break-inside: avoid;
    margin-bottom: 1rem;
  }

  .video-card__actions,
  .badge--new {
    display: none;
  }
}
```

---

## Performance Optimization Strategies

### 1. Intersection Observer Lazy Loading

```tsx
// /frontend/src/hooks/useIntersectionObserver.ts
import { useEffect, useRef, useState } from 'react';

interface UseIntersectionObserverOptions {
  threshold?: number | number[];
  rootMargin?: string;
  root?: Element | null;
}

export function useIntersectionObserver(
  options: UseIntersectionObserverOptions = {}
): [React.RefCallback<Element>, boolean] {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [element, setElement] = useState<Element | null>(null);

  useEffect(() => {
    if (!element) return;

    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting);
    }, options);

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [element, options.threshold, options.rootMargin, options.root]);

  return [setElement, isIntersecting];
}
```

### 2. Virtual Scrolling for Large Collections

```tsx
// /frontend/src/hooks/useVirtualization.ts
import { useMemo, useState, useEffect } from 'react';

interface VirtualizationOptions {
  containerRef: React.RefObject<HTMLElement>;
  itemHeight: number;
  overscan?: number;
}

export function useVirtualization<T>(items: T[], options: VirtualizationOptions | null) {
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);

  useEffect(() => {
    if (!options?.containerRef.current) return;

    const container = options.containerRef.current;

    const handleScroll = () => {
      setScrollTop(container.scrollTop);
    };

    const handleResize = () => {
      setContainerHeight(container.clientHeight);
    };

    container.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', handleResize);

    // Initial measurement
    handleResize();

    return () => {
      container.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
    };
  }, [options]);

  return useMemo(() => {
    if (!options) return items;

    const { itemHeight, overscan = 5 } = options;
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(items.length - 1, startIndex + visibleCount + overscan * 2);

    return items.slice(startIndex, endIndex + 1);
  }, [items, scrollTop, containerHeight, options]);
}
```

---

## Anti-Patterns to Avoid

❌ **Viewport-Only Responsive Design**: Don't use only viewport media queries for grid responsiveness

- **Why bad**: Cards can't adapt when embedded in sidebars, modals, or varying container widths
- **Better**: Use Container Queries as primary responsive mechanism with viewport fallbacks

❌ **Eager Image Loading**: Don't load all thumbnails immediately on page load

- **Why bad**: Wastes bandwidth, slows initial page load, poor performance on mobile
- **Better**: Implement intersection observer lazy loading with progressive enhancement

❌ **Static Card Information**: Don't show the same metadata regardless of user context or card state

- **Why bad**: Doesn't help users make decisions, wastes space, ignores user preferences
- **Better**: Progressive disclosure based on hover/focus with context-relevant information

❌ **Generic Grid Layouts**: Don't use the same grid for all content types and screen sizes

- **Why bad**: Different content types need different presentation approaches
- **Better**: Adaptive grid with content-aware sizing and context-specific layouts

❌ **Missing Accessibility**: Don't ignore keyboard navigation and screen reader support

- **Why bad**: Excludes users with disabilities, violates accessibility standards
- **Better**: Full keyboard navigation with proper ARIA labels and focus management

---

## Variation Guidance

**IMPORTANT**: Grid implementations should vary based on content type and context.

**Vary by Content Type**:

- **Movies**: Larger cards with poster aspect ratio, emphasis on visual appeal
- **TV Episodes**: Compact cards with series grouping, episode metadata prominent
- **User-Generated**: Square thumbnails, creator information, upload date emphasis
- **Live Content**: Real-time indicators, viewer count, streaming quality badges

**Vary by User Context**:

- **Browsing Mode**: Larger cards with rich hover states and detailed metadata
- **Search Results**: Compact cards with relevance scoring and match highlighting
- **Mobile Touch**: Larger touch targets, simplified hover states, swipe gestures
- **Accessibility Mode**: High contrast, larger text, simplified animations

**Vary by Collection Size**:

- **Small Collections**: Larger cards, more whitespace, detailed descriptions
- **Large Libraries**: Compact cards, virtualization, advanced filtering
- **Mixed Content**: Category-based sizing, adaptive card types

**Avoid converging on single Netflix-clone grid patterns** - adapt the visual hierarchy and interaction patterns to your specific content types and user needs.

---

## Remember

**Grid systems are the foundation of content discovery.** Every design decision should accelerate users toward content they want to watch while maintaining visual delight.

The best video grids:

- Load progressively without sacrificing perceived performance
- Adapt fluidly to any container size and device capability
- Surface the right information at the right interaction level
- Feel responsive and immediate across all input methods

**This grid framework empowers SOFATHEK to present content as engagingly as Netflix while performing efficiently across all devices and usage contexts.**
