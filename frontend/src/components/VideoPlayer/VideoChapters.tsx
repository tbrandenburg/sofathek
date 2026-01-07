import React, { useState, useRef, useEffect } from 'react';
import { Chapter } from '../../types';
import './VideoChapters.css';

interface VideoChaptersProps {
  chapters: Chapter[];
  currentTime: number;
  duration: number;
  onSeekToChapter: (time: number) => void;
  className?: string;
}

export const VideoChapters: React.FC<VideoChaptersProps> = ({
  chapters,
  currentTime,
  duration,
  onSeekToChapter,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredChapter, setHoveredChapter] = useState<string | null>(null);
  const chaptersRef = useRef<HTMLDivElement>(null);

  // Find current chapter
  const getCurrentChapter = (): Chapter | null => {
    if (!chapters.length) return null;

    for (let i = chapters.length - 1; i >= 0; i--) {
      if (currentTime >= chapters[i].startTime) {
        return chapters[i];
      }
    }
    return chapters[0];
  };

  const currentChapter = getCurrentChapter();

  // Format time display
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate chapter duration
  const getChapterDuration = (chapter: Chapter, index: number): number => {
    if (index < chapters.length - 1) {
      return chapters[index + 1].startTime - chapter.startTime;
    }
    return duration - chapter.startTime;
  };

  // Handle chapter click
  const handleChapterClick = (chapter: Chapter) => {
    onSeekToChapter(chapter.startTime);
    setIsOpen(false);
  };

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;

      switch (event.code) {
        case 'Escape':
          event.preventDefault();
          setIsOpen(false);
          break;
        case 'ArrowUp':
        case 'ArrowDown':
          // Future enhancement: keyboard navigation through chapters
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Close chapters panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        chaptersRef.current &&
        !chaptersRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  if (!chapters.length) {
    return null;
  }

  return (
    <div className={`video-chapters ${className}`} ref={chaptersRef}>
      {/* Chapter Toggle Button */}
      <button
        className="chapters-toggle"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? 'Close chapters' : 'Open chapters'}
        title={currentChapter ? `Current: ${currentChapter.title}` : 'Chapters'}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="9" y1="9" x2="15" y2="9" />
          <line x1="9" y1="15" x2="15" y2="15" />
        </svg>
        <span className="chapter-count">{chapters.length}</span>
      </button>

      {/* Chapters Panel */}
      {isOpen && (
        <div className="chapters-panel">
          <div className="chapters-header">
            <h3>Chapters ({chapters.length})</h3>
            <button
              className="chapters-close"
              onClick={() => setIsOpen(false)}
              aria-label="Close chapters"
            >
              <svg
                width="20"
                height="20"
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

          <div className="chapters-list">
            {chapters.map((chapter, index) => {
              const isCurrentChapter = currentChapter?.id === chapter.id;
              const chapterDuration = getChapterDuration(chapter, index);
              const progressPercent = isCurrentChapter
                ? Math.min(
                    100,
                    ((currentTime - chapter.startTime) / chapterDuration) * 100
                  )
                : 0;

              return (
                <div
                  key={chapter.id}
                  className={`chapter-item ${isCurrentChapter ? 'current' : ''}`}
                  onClick={() => handleChapterClick(chapter)}
                  onMouseEnter={() => setHoveredChapter(chapter.id)}
                  onMouseLeave={() => setHoveredChapter(null)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => {
                    if (e.code === 'Enter' || e.code === 'Space') {
                      e.preventDefault();
                      handleChapterClick(chapter);
                    }
                  }}
                >
                  {/* Chapter Thumbnail */}
                  <div className="chapter-thumbnail">
                    {chapter.thumbnail ? (
                      <img
                        src={chapter.thumbnail}
                        alt={`${chapter.title} thumbnail`}
                        loading="lazy"
                      />
                    ) : (
                      <div className="chapter-thumbnail-placeholder">
                        <svg
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <polygon points="5,3 19,12 5,21" />
                        </svg>
                      </div>
                    )}

                    {/* Progress indicator for current chapter */}
                    {isCurrentChapter && (
                      <div className="chapter-progress">
                        <div
                          className="chapter-progress-fill"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    )}

                    {/* Chapter number overlay */}
                    <div className="chapter-number">{index + 1}</div>
                  </div>

                  {/* Chapter Info */}
                  <div className="chapter-info">
                    <div className="chapter-title" title={chapter.title}>
                      {chapter.title}
                    </div>
                    <div className="chapter-time">
                      {formatTime(chapter.startTime)} •{' '}
                      {formatTime(chapterDuration)}
                    </div>
                  </div>

                  {/* Play indicator for current chapter */}
                  {isCurrentChapter && (
                    <div className="chapter-playing-indicator">
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <polygon points="5,3 19,12 5,21" />
                      </svg>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Quick navigation hint */}
          <div className="chapters-hint">
            <small>Click a chapter to jump to that section</small>
          </div>
        </div>
      )}

      {/* Chapter markers on progress bar (for parent integration) */}
      <div className="chapter-markers" style={{ display: 'none' }}>
        {chapters.map(chapter => {
          const position = (chapter.startTime / duration) * 100;
          return (
            <div
              key={`marker-${chapter.id}`}
              className="chapter-marker"
              style={{ left: `${position}%` }}
              title={`${chapter.title} - ${formatTime(chapter.startTime)}`}
              onClick={() => onSeekToChapter(chapter.startTime)}
            />
          );
        })}
      </div>
    </div>
  );
};

export default VideoChapters;
