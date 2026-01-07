import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Subtitle } from '../../types';
import './SubtitleTrack.css';

interface SubtitleCue {
  id: string;
  startTime: number;
  endTime: number;
  text: string;
  position?: {
    x?: number;
    y?: number;
    align?: 'left' | 'center' | 'right';
  };
  style?: {
    color?: string;
    fontSize?: string;
    fontWeight?: string;
    backgroundColor?: string;
  };
}

interface SubtitleTrackProps {
  subtitles: Subtitle[];
  currentTime: number;
  isVisible: boolean;
  selectedSubtitleId?: string;
  onSubtitleSelect: (subtitleId: string | undefined) => void;
  className?: string;
  displayOnly?: boolean; // Only show subtitle text, not controls
}

export const SubtitleTrack: React.FC<SubtitleTrackProps> = ({
  subtitles,
  currentTime,
  isVisible,
  selectedSubtitleId,
  onSubtitleSelect,
  className = '',
  displayOnly = false,
}) => {
  const [subtitleCues, setSubtitleCues] = useState<Map<string, SubtitleCue[]>>(
    new Map()
  );
  const [isSubtitleMenuOpen, setIsSubtitleMenuOpen] = useState(false);
  const [fontSize, setFontSize] = useState('medium');
  const [fontColor, setFontColor] = useState('white');
  const [backgroundColor, setBackgroundColor] = useState('black');
  const [position, setPosition] = useState('bottom');
  const menuRef = useRef<HTMLDivElement>(null);

  const selectedSubtitle = subtitles.find(sub => sub.id === selectedSubtitleId);

  // Load subtitle file content
  const loadSubtitleFile = async (
    subtitle: Subtitle
  ): Promise<SubtitleCue[]> => {
    try {
      // In a real implementation, this would fetch the subtitle file
      // For now, we'll return mock data based on the subtitle type
      return generateMockSubtitles(subtitle);
    } catch (error) {
      console.error(`Failed to load subtitle file: ${subtitle.path}`, error);
      return [];
    }
  };

  // Generate mock subtitles for development
  const generateMockSubtitles = (subtitle: Subtitle): SubtitleCue[] => {
    const mockCues: SubtitleCue[] = [
      {
        id: 'cue_1',
        startTime: 0,
        endTime: 5,
        text: `Welcome to this video! (${subtitle.language})`,
      },
      {
        id: 'cue_2',
        startTime: 5,
        endTime: 10,
        text: `This is an example subtitle in ${subtitle.language}.`,
      },
      {
        id: 'cue_3',
        startTime: 10,
        endTime: 15,
        text: 'You can customize the appearance and position.',
      },
      {
        id: 'cue_4',
        startTime: 20,
        endTime: 25,
        text: 'Subtitles support multiple languages and formats.',
      },
      {
        id: 'cue_5',
        startTime: 30,
        endTime: 35,
        text: 'This includes .srt, .vtt, and .ass formats.',
      },
    ];

    return mockCues;
  };

  // Load subtitle cues when subtitles change
  useEffect(() => {
    const loadAllSubtitles = async () => {
      const newCuesMap = new Map<string, SubtitleCue[]>();

      for (const subtitle of subtitles) {
        const cues = await loadSubtitleFile(subtitle);
        newCuesMap.set(subtitle.id, cues);
      }

      setSubtitleCues(newCuesMap);
    };

    if (subtitles.length > 0) {
      loadAllSubtitles();
    }
  }, [subtitles]);

  // Find current subtitle cue
  const currentCue = useMemo(() => {
    if (!selectedSubtitle) return null;

    const cues = subtitleCues.get(selectedSubtitle.id);
    if (!cues) return null;

    return (
      cues.find(
        cue => currentTime >= cue.startTime && currentTime <= cue.endTime
      ) || null
    );
  }, [selectedSubtitle, subtitleCues, currentTime]);

  // Close subtitle menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsSubtitleMenuOpen(false);
      }
    };

    if (isSubtitleMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isSubtitleMenuOpen]);

  // Format subtitle text (handle line breaks, styling)
  const formatSubtitleText = (text: string): React.ReactNode => {
    return text.split('\n').map((line, index) => (
      <React.Fragment key={index}>
        {index > 0 && <br />}
        {line}
      </React.Fragment>
    ));
  };

  // Get subtitle style based on settings
  const getSubtitleStyle = () => {
    const fontSizeMap = {
      small: '14px',
      medium: '18px',
      large: '24px',
      'extra-large': '32px',
    };

    return {
      fontSize: fontSizeMap[fontSize as keyof typeof fontSizeMap] || '18px',
      color: fontColor,
      backgroundColor:
        backgroundColor === 'transparent' ? 'transparent' : backgroundColor,
      textShadow:
        backgroundColor === 'transparent'
          ? '2px 2px 4px rgba(0, 0, 0, 0.8)'
          : 'none',
    };
  };

  // Get subtitle position class
  const getPositionClass = () => {
    switch (position) {
      case 'top':
        return 'subtitle-position-top';
      case 'middle':
        return 'subtitle-position-middle';
      case 'bottom':
      default:
        return 'subtitle-position-bottom';
    }
  };

  return (
    <div className={`subtitle-track ${className}`}>
      {/* Subtitle Display */}
      {(displayOnly || isVisible) && currentCue && (
        <div
          className={`subtitle-display ${getPositionClass()}`}
          style={getSubtitleStyle()}
        >
          <div className="subtitle-text">
            {formatSubtitleText(currentCue.text)}
          </div>
        </div>
      )}

      {/* Subtitle Controls - Only show if not display-only mode */}
      {!displayOnly && (
        <div className="subtitle-controls" ref={menuRef}>
          <button
            className="subtitle-toggle"
            onClick={() => setIsSubtitleMenuOpen(!isSubtitleMenuOpen)}
            aria-label={
              isSubtitleMenuOpen ? 'Close subtitle menu' : 'Open subtitle menu'
            }
            title="Subtitle settings"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M7 8h10M7 12h4M7 16h10" />
              <rect width="20" height="16" x="2" y="4" rx="2" />
            </svg>
            {selectedSubtitle && (
              <span className="subtitle-indicator">
                {selectedSubtitle.language.toUpperCase()}
              </span>
            )}
          </button>

          {/* Subtitle Menu */}
          {isSubtitleMenuOpen && (
            <div className="subtitle-menu">
              <div className="subtitle-menu-header">
                <h3>Subtitles & Captions</h3>
                <button
                  className="subtitle-menu-close"
                  onClick={() => setIsSubtitleMenuOpen(false)}
                  aria-label="Close subtitle menu"
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

              {/* Subtitle Language Selection */}
              <div className="subtitle-section">
                <h4>Language</h4>
                <div className="subtitle-language-list">
                  <label className="subtitle-option">
                    <input
                      type="radio"
                      name="subtitle-language"
                      checked={!selectedSubtitleId}
                      onChange={() => onSubtitleSelect(undefined)}
                    />
                    <span>Off</span>
                  </label>

                  {subtitles.map(subtitle => (
                    <label key={subtitle.id} className="subtitle-option">
                      <input
                        type="radio"
                        name="subtitle-language"
                        checked={selectedSubtitleId === subtitle.id}
                        onChange={() => onSubtitleSelect(subtitle.id)}
                      />
                      <span>
                        {subtitle.language.toUpperCase()}
                        {subtitle.default && (
                          <span className="default-badge">Default</span>
                        )}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Subtitle Appearance Settings */}
              {selectedSubtitleId && (
                <>
                  <div className="subtitle-section">
                    <h4>Font Size</h4>
                    <select
                      value={fontSize}
                      onChange={e => setFontSize(e.target.value)}
                      className="subtitle-select"
                    >
                      <option value="small">Small</option>
                      <option value="medium">Medium</option>
                      <option value="large">Large</option>
                      <option value="extra-large">Extra Large</option>
                    </select>
                  </div>

                  <div className="subtitle-section">
                    <h4>Font Color</h4>
                    <select
                      value={fontColor}
                      onChange={e => setFontColor(e.target.value)}
                      className="subtitle-select"
                    >
                      <option value="white">White</option>
                      <option value="yellow">Yellow</option>
                      <option value="cyan">Cyan</option>
                      <option value="green">Green</option>
                      <option value="magenta">Magenta</option>
                    </select>
                  </div>

                  <div className="subtitle-section">
                    <h4>Background</h4>
                    <select
                      value={backgroundColor}
                      onChange={e => setBackgroundColor(e.target.value)}
                      className="subtitle-select"
                    >
                      <option value="transparent">Transparent</option>
                      <option value="black">Black</option>
                      <option value="rgba(0,0,0,0.8)">
                        Semi-transparent Black
                      </option>
                      <option value="rgba(0,0,0,0.5)">Light Black</option>
                    </select>
                  </div>

                  <div className="subtitle-section">
                    <h4>Position</h4>
                    <select
                      value={position}
                      onChange={e => setPosition(e.target.value)}
                      className="subtitle-select"
                    >
                      <option value="bottom">Bottom</option>
                      <option value="middle">Middle</option>
                      <option value="top">Top</option>
                    </select>
                  </div>

                  {/* Preview */}
                  <div className="subtitle-section">
                    <h4>Preview</h4>
                    <div
                      className="subtitle-preview"
                      style={getSubtitleStyle()}
                    >
                      Sample subtitle text
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SubtitleTrack;
