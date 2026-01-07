/**
 * Sofathek Test Fixtures
 * CEO-level test data and mocks for comprehensive testing
 */

export const SofathekFixtures = {
  /**
   * Sample video metadata for testing
   */
  sampleVideos: [
    {
      id: 'test-video-1',
      title: 'Family Movie Night',
      description: 'A heartwarming family film perfect for all ages',
      duration: '1h 45m',
      genre: 'Family',
      year: 2023,
      thumbnail: '/test-assets/thumbnail-1.jpg',
      videoPath: '/test-assets/sample-video-1.mp4',
      metadata: {
        resolution: '1080p',
        format: 'MP4',
        size: '2.1 GB',
        addedDate: '2024-01-01',
      },
    },
    {
      id: 'test-video-2',
      title: 'Documentary Special',
      description: 'Educational content for the whole family',
      duration: '58m',
      genre: 'Documentary',
      year: 2023,
      thumbnail: '/test-assets/thumbnail-2.jpg',
      videoPath: '/test-assets/sample-video-2.mp4',
      metadata: {
        resolution: '4K',
        format: 'MP4',
        size: '4.8 GB',
        addedDate: '2024-01-02',
      },
    },
  ],

  /**
   * Theme configurations for testing all 10 themes
   */
  themes: {
    'netflix-dark': {
      name: 'Netflix Dark',
      primaryColor: '#e50914',
      backgroundColor: '#141414',
      textColor: '#ffffff',
    },
    'netflix-light': {
      name: 'Netflix Light',
      primaryColor: '#e50914',
      backgroundColor: '#ffffff',
      textColor: '#000000',
    },
    'disney-magic': {
      name: 'Disney Magic',
      primaryColor: '#0063d1',
      backgroundColor: '#f8f9fa',
      textColor: '#1a1a1a',
    },
    'prime-video': {
      name: 'Prime Video',
      primaryColor: '#00a8e1',
      backgroundColor: '#0f171e',
      textColor: '#ffffff',
    },
    'hulu-green': {
      name: 'Hulu Green',
      primaryColor: '#1ce783',
      backgroundColor: '#0b0e0f',
      textColor: '#ffffff',
    },
    'apple-tv': {
      name: 'Apple TV+',
      primaryColor: '#000000',
      backgroundColor: '#ffffff',
      textColor: '#1d1d1f',
    },
    'hbo-max': {
      name: 'HBO Max',
      primaryColor: '#9724d6',
      backgroundColor: '#000000',
      textColor: '#ffffff',
    },
    paramount: {
      name: 'Paramount+',
      primaryColor: '#0064ff',
      backgroundColor: '#101820',
      textColor: '#ffffff',
    },
    peacock: {
      name: 'Peacock',
      primaryColor: '#fd5901',
      backgroundColor: '#000000',
      textColor: '#ffffff',
    },
    discovery: {
      name: 'Discovery+',
      primaryColor: '#0077c8',
      backgroundColor: '#ffffff',
      textColor: '#000000',
    },
  },

  /**
   * User journey test data
   */
  userJourneys: {
    firstTimeUser: {
      actions: [
        'navigate_to_home',
        'view_video_library',
        'explore_themes',
        'attempt_video_play',
        'navigate_back_home',
      ],
      expectedOutcomes: [
        'sees_welcome_interface',
        'understands_navigation',
        'can_switch_themes',
        'finds_video_controls',
        'maintains_theme_preference',
      ],
    },
    familyMovieNight: {
      actions: [
        'browse_family_content',
        'filter_by_genre',
        'select_movie',
        'start_playback',
        'adjust_volume',
        'enable_subtitles',
        'pause_resume',
        'finish_watching',
      ],
      expectedOutcomes: [
        'finds_appropriate_content',
        'video_plays_smoothly',
        'controls_work_perfectly',
        'settings_persist',
        'viewing_tracked',
      ],
    },
    adminManagement: {
      actions: [
        'access_admin_panel',
        'add_youtube_url',
        'monitor_download',
        'manage_library',
        'configure_settings',
      ],
      expectedOutcomes: [
        'successful_authentication',
        'download_completes',
        'video_appears_in_library',
        'metadata_extracted',
        'settings_saved',
      ],
    },
  },

  /**
   * Performance benchmarks based on streaming industry standards
   */
  performanceBenchmarks: {
    pageLoad: {
      excellent: 1000, // Under 1 second
      good: 2000, // Under 2 seconds
      acceptable: 3000, // Under 3 seconds (fail above this)
    },
    videoStart: {
      excellent: 1500, // Under 1.5 seconds
      good: 3000, // Under 3 seconds
      acceptable: 5000, // Under 5 seconds (fail above this)
    },
    themeSwitch: {
      excellent: 50, // Under 50ms
      good: 100, // Under 100ms
      acceptable: 200, // Under 200ms (fail above this)
    },
    searchResponse: {
      excellent: 200, // Under 200ms
      good: 500, // Under 500ms
      acceptable: 1000, // Under 1 second (fail above this)
    },
  },

  /**
   * Accessibility test scenarios
   */
  accessibilityScenarios: {
    keyboardOnly: {
      description: 'User navigates using only keyboard',
      testElements: [
        'navigation',
        'video-cards',
        'player-controls',
        'settings',
      ],
    },
    screenReader: {
      description: 'User with screen reader',
      requirements: [
        'semantic-html',
        'aria-labels',
        'alt-text',
        'focus-management',
      ],
    },
    highContrast: {
      description: 'User with high contrast needs',
      testModes: ['light', 'dark', 'high-contrast'],
    },
    reducedMotion: {
      description: 'User prefers reduced motion',
      testAnimations: ['transitions', 'hover-effects', 'loading-spinners'],
    },
  },

  /**
   * API mock responses for testing
   */
  apiMocks: {
    healthCheck: {
      status: 200,
      body: { status: 'healthy', timestamp: Date.now() },
    },
    videoLibrary: {
      status: 200,
      body: {
        videos: [], // Will use sampleVideos when needed
        totalCount: 0,
        page: 1,
        limit: 20,
      },
    },
    downloadStatus: {
      status: 200,
      body: {
        id: 'test-download-1',
        status: 'completed',
        progress: 100,
        filename: 'test-video.mp4',
      },
    },
  },

  /**
   * Error scenarios for comprehensive testing
   */
  errorScenarios: {
    networkFailures: [
      { type: 'connection_timeout', status: 0 },
      { type: 'server_error', status: 500 },
      { type: 'not_found', status: 404 },
      { type: 'unauthorized', status: 401 },
    ],
    videoPlaybackErrors: [
      { type: 'codec_not_supported', code: 'MEDIA_ERR_SRC_NOT_SUPPORTED' },
      { type: 'network_error', code: 'MEDIA_ERR_NETWORK' },
      { type: 'decode_error', code: 'MEDIA_ERR_DECODE' },
    ],
    downloadErrors: [
      { type: 'invalid_url', message: 'URL is not accessible' },
      { type: 'unsupported_format', message: 'Video format not supported' },
      { type: 'storage_full', message: 'Insufficient storage space' },
    ],
  },
};
