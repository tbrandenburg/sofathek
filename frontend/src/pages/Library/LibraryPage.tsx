/**
 * LibraryPage - Video Library Browser
 * Netflix-like interface for browsing and searching videos
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVideoLibrary, useCategories } from '../../hooks';
import { Video, LibraryFilters } from '../../types';
import SearchBar from '../../components/SearchBar';
import VideoGrid from '../../components/VideoGrid';
import CategoryFilter from '../../components/CategoryFilter';
import './LibraryPage.css';

export function LibraryPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<LibraryFilters>({
    page: 1,
    limit: 24,
  });

  const { library, loading, error, scanLibrary, refreshLibrary } =
    useVideoLibrary(filters);

  const { categories, loading: categoriesLoading } = useCategories();

  // Handle search
  const handleSearch = useCallback((query: string) => {
    setFilters(prev => ({
      ...prev,
      search: query || undefined,
      page: 1, // Reset to first page on new search
    }));
  }, []);

  // Handle category filter
  const handleCategoryChange = useCallback((category: string | undefined) => {
    setFilters(prev => ({
      ...prev,
      category,
      page: 1, // Reset to first page on category change
    }));
  }, []);

  // Handle video click
  const handleVideoClick = useCallback(
    (video: Video) => {
      navigate(`/video/${video.id}`);
    },
    [navigate]
  );

  // Handle library scan
  const handleScanLibrary = useCallback(async () => {
    try {
      await scanLibrary();
      // Refresh the library after scan
      setTimeout(refreshLibrary, 1000);
    } catch (error) {
      console.error('Failed to scan library:', error);
    }
  }, [scanLibrary, refreshLibrary]);

  // Load more videos (pagination)
  const handleLoadMore = useCallback(() => {
    if (library && filters.page! < library.pagination.totalPages) {
      setFilters(prev => ({
        ...prev,
        page: (prev.page || 1) + 1,
      }));
    }
  }, [library, filters.page]);

  // Auto-refresh every 30 seconds if no videos found
  useEffect(() => {
    if (library && library.videos.length === 0 && !loading) {
      const interval = setInterval(refreshLibrary, 30000);
      return () => clearInterval(interval);
    }
  }, [library, loading, refreshLibrary]);

  const hasVideos = library && library.videos.length > 0;
  const isSearching = Boolean(filters.search);
  const isFiltering = Boolean(filters.category);
  const showLoadMore = library && filters.page! < library.pagination.totalPages;

  return (
    <div className="library-page">
      <div className="library-container">
        {/* Header */}
        <div className="library-header">
          <div className="header-content">
            <h1>Video Library</h1>
            <div className="header-actions">
              <button
                onClick={handleScanLibrary}
                className="scan-button"
                disabled={loading}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M3 7V5c0-1.1.9-2 2-2h2" />
                  <path d="M17 3h2c1.1 0 2 .9 2 2v2" />
                  <path d="M21 17v2c0 1.1-.9 2-2 2h-2" />
                  <path d="M7 21H5c-1.1 0-2-.9-2-2v-2" />
                  <path d="M7 8l5 5 5-5" />
                </svg>
                Scan Library
              </button>
              <button
                onClick={refreshLibrary}
                className="refresh-button"
                disabled={loading}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polyline points="23,4 23,10 17,10" />
                  <polyline points="1,20 1,14 7,14" />
                  <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
                </svg>
                Refresh
              </button>
            </div>
          </div>

          {/* Library Stats */}
          {library && (
            <div className="library-stats">
              <div className="stat">
                <span className="stat-value">{library.pagination.total}</span>
                <span className="stat-label">Total Videos</span>
              </div>
              {library.scanStats && (
                <>
                  <div className="stat">
                    <span className="stat-value">
                      {library.scanStats.scanned}
                    </span>
                    <span className="stat-label">Scanned</span>
                  </div>
                  <div className="stat">
                    <span className="stat-value">
                      {library.scanStats.processed}
                    </span>
                    <span className="stat-label">Processed</span>
                  </div>
                  {library.scanStats.errors > 0 && (
                    <div className="stat error">
                      <span className="stat-value">
                        {library.scanStats.errors}
                      </span>
                      <span className="stat-label">Errors</span>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="library-filters">
          <SearchBar
            onSearch={handleSearch}
            placeholder="Search videos by title, description..."
            className="library-search"
          />

          <CategoryFilter
            categories={categories}
            selectedCategory={filters.category}
            onCategoryChange={handleCategoryChange}
            loading={categoriesLoading}
          />
        </div>

        {/* Active Filters */}
        {(isSearching || isFiltering) && (
          <div className="active-filters">
            <span className="filters-label">Active filters:</span>
            {isSearching && (
              <div className="filter-tag">
                <span>Search: "{filters.search}"</span>
                <button
                  onClick={() => handleSearch('')}
                  aria-label="Clear search"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            )}
            {isFiltering && (
              <div className="filter-tag">
                <span>Category: {filters.category}</span>
                <button
                  onClick={() => handleCategoryChange(undefined)}
                  aria-label="Clear category"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            )}
            <button
              className="clear-all-filters"
              onClick={() => {
                handleSearch('');
                handleCategoryChange(undefined);
              }}
            >
              Clear All
            </button>
          </div>
        )}

        {/* Video Grid */}
        <div className="library-content">
          <VideoGrid
            videos={library?.videos || []}
            loading={loading}
            error={error || undefined}
            onVideoClick={handleVideoClick}
            cardSize="medium"
            showMetadata={true}
            emptyMessage={
              isSearching || isFiltering
                ? 'No videos match your search criteria'
                : 'No videos found. Try scanning your media library!'
            }
          />

          {/* Load More */}
          {showLoadMore && (
            <div className="load-more-section">
              <button
                onClick={handleLoadMore}
                className="load-more-button"
                disabled={loading}
              >
                {loading ? 'Loading...' : 'Load More Videos'}
              </button>
              <div className="pagination-info">
                Showing {library.videos.length} of {library.pagination.total}{' '}
                videos
              </div>
            </div>
          )}
        </div>

        {/* No Videos State */}
        {!hasVideos && !loading && !error && (
          <div className="no-videos-help">
            <div className="help-content">
              <h3>Get Started with Your Media Library</h3>
              <ol>
                <li>Add video files to your media directories</li>
                <li>Click "Scan Library" to discover new videos</li>
                <li>
                  Or <a href="/upload">upload videos directly</a>
                </li>
                <li>
                  Or <a href="/downloads">download from YouTube</a>
                </li>
              </ol>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
