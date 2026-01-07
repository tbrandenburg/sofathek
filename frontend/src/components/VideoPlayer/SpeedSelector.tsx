import React, { useState, useRef, useEffect } from 'react';
import './SpeedSelector.css';

interface SpeedSelectorProps {
  currentSpeed: number;
  onSpeedChange: (speed: number) => void;
  className?: string;
}

export const SpeedSelector: React.FC<SpeedSelectorProps> = ({
  currentSpeed,
  onSpeedChange,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Available playback speeds
  const speeds = [
    { value: 0.25, label: '0.25x' },
    { value: 0.5, label: '0.5x' },
    { value: 0.75, label: '0.75x' },
    { value: 1, label: 'Normal' },
    { value: 1.25, label: '1.25x' },
    { value: 1.5, label: '1.5x' },
    { value: 1.75, label: '1.75x' },
    { value: 2, label: '2x' },
  ];

  // Get current speed label
  const getCurrentSpeedLabel = (): string => {
    const speed = speeds.find(s => s.value === currentSpeed);
    return speed ? speed.label : `${currentSpeed}x`;
  };

  // Handle speed selection
  const handleSpeedSelect = (speed: number) => {
    onSpeedChange(speed);
    setIsOpen(false);
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

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
          // Future enhancement: keyboard navigation through speeds
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  return (
    <div className={`speed-selector ${className}`} ref={menuRef}>
      {/* Speed Toggle Button */}
      <button
        className="speed-toggle"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? 'Close speed menu' : 'Open speed menu'}
        title={`Playback speed: ${getCurrentSpeedLabel()}`}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="12" cy="12" r="10" />
          <polyline points="12,6 12,12 16,14" />
        </svg>
        <span className="speed-label">{getCurrentSpeedLabel()}</span>
      </button>

      {/* Speed Menu */}
      {isOpen && (
        <div className="speed-menu">
          <div className="speed-menu-header">
            <h3>Playback Speed</h3>
            <button
              className="speed-menu-close"
              onClick={() => setIsOpen(false)}
              aria-label="Close speed menu"
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

          <div className="speed-list">
            {speeds.map(speed => (
              <button
                key={speed.value}
                className={`speed-option ${currentSpeed === speed.value ? 'active' : ''}`}
                onClick={() => handleSpeedSelect(speed.value)}
                role="menuitem"
                aria-selected={currentSpeed === speed.value}
              >
                <span className="speed-value">{speed.label}</span>
                {currentSpeed === speed.value && (
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="speed-check"
                  >
                    <polyline points="20,6 9,17 4,12" />
                  </svg>
                )}
              </button>
            ))}
          </div>

          {/* Speed Info */}
          <div className="speed-info">
            <small>
              {currentSpeed < 1
                ? 'Slower playback'
                : currentSpeed === 1
                  ? 'Normal speed'
                  : 'Faster playback'}
            </small>
          </div>
        </div>
      )}
    </div>
  );
};

export default SpeedSelector;
