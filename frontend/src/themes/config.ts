/**
 * Sofathek Theme System
 * 10 carefully crafted themes inspired by popular streaming platforms
 */

export interface ThemeColors {
  // Primary Colors
  primary: string;
  primaryHover: string;
  primaryAlpha: string;

  // Background Colors
  backgroundPrimary: string;
  backgroundSecondary: string;
  backgroundTertiary: string;

  // Text Colors
  textPrimary: string;
  textSecondary: string;
  textMuted: string;

  // Accent Colors
  accentColor: string;
  accentColorHover: string;
  accentColorAlpha: string;

  // UI Colors
  borderColor: string;
  borderColorHover: string;
  shadowColor: string;

  // Status Colors
  successColor: string;
  warningColor: string;
  errorColor: string;
  infoColor: string;

  // Interactive Colors
  hoverColor: string;
  activeColor: string;
  focusColor: string;

  // Surface Colors
  cardBackground: string;
  modalBackground: string;
  overlayBackground: string;

  // Video Player Colors
  videoBackground: string;
  overlayBorder: string;
  controlProgressBg: string;
  controlHoverBg: string;
}

export interface Theme {
  id: string;
  name: string;
  description: string;
  category: 'streaming' | 'custom';
  inspiration: string;
  colors: ThemeColors;
}

// Netflix Dark - Our current default theme
const netflixDark: Theme = {
  id: 'netflix-dark',
  name: 'Netflix Dark',
  description: 'The classic Netflix dark theme with red accents',
  category: 'streaming',
  inspiration: 'Netflix',
  colors: {
    primary: '#e50914',
    primaryHover: '#f40612',
    primaryAlpha: 'rgba(229, 9, 20, 0.1)',

    backgroundPrimary: '#141414',
    backgroundSecondary: '#1f1f1f',
    backgroundTertiary: '#2a2a2a',

    textPrimary: '#ffffff',
    textSecondary: '#b3b3b3',
    textMuted: '#808080',

    accentColor: '#e50914',
    accentColorHover: '#f40612',
    accentColorAlpha: 'rgba(229, 9, 20, 0.15)',

    borderColor: '#333333',
    borderColorHover: '#555555',
    shadowColor: 'rgba(0, 0, 0, 0.5)',

    successColor: '#46d369',
    warningColor: '#ffa500',
    errorColor: '#e50914',
    infoColor: '#0ea5e9',

    hoverColor: 'rgba(255, 255, 255, 0.1)',
    activeColor: 'rgba(255, 255, 255, 0.2)',
    focusColor: '#e50914',

    cardBackground: '#1f1f1f',
    modalBackground: 'rgba(0, 0, 0, 0.8)',
    overlayBackground: 'rgba(0, 0, 0, 0.6)',

    // Video Player
    videoBackground: '#000000',
    overlayBorder: 'rgba(255, 255, 255, 0.3)',
    controlProgressBg: 'rgba(255, 255, 255, 0.3)',
    controlHoverBg: 'rgba(255, 255, 255, 0.2)',
  },
};

// YouTube Light - Clean white interface with red accents
const youtubeLight: Theme = {
  id: 'youtube-light',
  name: 'YouTube Light',
  description: 'Clean white interface inspired by YouTube',
  category: 'streaming',
  inspiration: 'YouTube',
  colors: {
    primary: '#ff0000',
    primaryHover: '#cc0000',
    primaryAlpha: 'rgba(255, 0, 0, 0.1)',

    backgroundPrimary: '#ffffff',
    backgroundSecondary: '#f9f9f9',
    backgroundTertiary: '#f0f0f0',

    textPrimary: '#0f0f0f',
    textSecondary: '#606060',
    textMuted: '#909090',

    accentColor: '#ff0000',
    accentColorHover: '#cc0000',
    accentColorAlpha: 'rgba(255, 0, 0, 0.1)',

    borderColor: '#e5e5e5',
    borderColorHover: '#cccccc',
    shadowColor: 'rgba(0, 0, 0, 0.1)',

    successColor: '#00a856',
    warningColor: '#ff9500',
    errorColor: '#ff0000',
    infoColor: '#065fd4',

    hoverColor: 'rgba(0, 0, 0, 0.05)',
    activeColor: 'rgba(0, 0, 0, 0.1)',
    focusColor: '#065fd4',

    cardBackground: '#ffffff',
    modalBackground: 'rgba(0, 0, 0, 0.5)',
    overlayBackground: 'rgba(0, 0, 0, 0.3)',

    // Video Player
    videoBackground: '#000000',
    overlayBorder: 'rgba(0, 0, 0, 0.3)',
    controlProgressBg: 'rgba(0, 0, 0, 0.3)',
    controlHoverBg: 'rgba(0, 0, 0, 0.2)',
  },
};

// Disney+ Blue - Magical blue theme
const disneyPlus: Theme = {
  id: 'disney-plus',
  name: 'Disney+',
  description: 'Magical blue theme inspired by Disney+',
  category: 'streaming',
  inspiration: 'Disney+',
  colors: {
    primary: '#0063e5',
    primaryHover: '#0483ee',
    primaryAlpha: 'rgba(0, 99, 229, 0.1)',

    backgroundPrimary: '#040714',
    backgroundSecondary: '#0c1426',
    backgroundTertiary: '#1a1e29',

    textPrimary: '#f9f9f9',
    textSecondary: '#cacaca',
    textMuted: '#8a8a8a',

    accentColor: '#0063e5',
    accentColorHover: '#0483ee',
    accentColorAlpha: 'rgba(0, 99, 229, 0.15)',

    borderColor: '#2e344a',
    borderColorHover: '#4a5568',
    shadowColor: 'rgba(0, 0, 0, 0.6)',

    successColor: '#00b894',
    warningColor: '#fdcb6e',
    errorColor: '#e17055',
    infoColor: '#0063e5',

    hoverColor: 'rgba(255, 255, 255, 0.08)',
    activeColor: 'rgba(255, 255, 255, 0.15)',
    focusColor: '#0063e5',

    cardBackground: '#0c1426',
    modalBackground: 'rgba(4, 7, 20, 0.9)',
    overlayBackground: 'rgba(4, 7, 20, 0.7)',

    // Video Player
    videoBackground: '#000000',
    overlayBorder: 'rgba(255, 255, 255, 0.3)',
    controlProgressBg: 'rgba(255, 255, 255, 0.3)',
    controlHoverBg: 'rgba(255, 255, 255, 0.2)',
  },
};

// HBO Max - Purple luxury theme
const hboMax: Theme = {
  id: 'hbo-max',
  name: 'HBO Max',
  description: 'Premium purple theme inspired by HBO Max',
  category: 'streaming',
  inspiration: 'HBO Max',
  colors: {
    primary: '#7b2cbf',
    primaryHover: '#9d4edd',
    primaryAlpha: 'rgba(123, 44, 191, 0.1)',

    backgroundPrimary: '#0f0014',
    backgroundSecondary: '#1a0b2e',
    backgroundTertiary: '#2d1b3d',

    textPrimary: '#ffffff',
    textSecondary: '#c9c9c9',
    textMuted: '#9a9a9a',

    accentColor: '#7b2cbf',
    accentColorHover: '#9d4edd',
    accentColorAlpha: 'rgba(123, 44, 191, 0.15)',

    borderColor: '#3d2a4f',
    borderColorHover: '#5a4570',
    shadowColor: 'rgba(0, 0, 0, 0.7)',

    successColor: '#06ffa5',
    warningColor: '#ffb700',
    errorColor: '#ff006e',
    infoColor: '#7b2cbf',

    hoverColor: 'rgba(255, 255, 255, 0.08)',
    activeColor: 'rgba(255, 255, 255, 0.15)',
    focusColor: '#7b2cbf',

    cardBackground: '#1a0b2e',
    modalBackground: 'rgba(15, 0, 20, 0.9)',
    overlayBackground: 'rgba(15, 0, 20, 0.7)',

    // Video Player
    videoBackground: '#000000',
    overlayBorder: 'rgba(255, 255, 255, 0.3)',
    controlProgressBg: 'rgba(255, 255, 255, 0.3)',
    controlHoverBg: 'rgba(255, 255, 255, 0.2)',
  },
};

// Hulu Green - Fresh green theme
const hulu: Theme = {
  id: 'hulu',
  name: 'Hulu',
  description: 'Fresh green theme inspired by Hulu',
  category: 'streaming',
  inspiration: 'Hulu',
  colors: {
    primary: '#1ce783',
    primaryHover: '#3deb94',
    primaryAlpha: 'rgba(28, 231, 131, 0.1)',

    backgroundPrimary: '#0b1426',
    backgroundSecondary: '#151f3d',
    backgroundTertiary: '#1f2937',

    textPrimary: '#ffffff',
    textSecondary: '#d1d5db',
    textMuted: '#9ca3af',

    accentColor: '#1ce783',
    accentColorHover: '#3deb94',
    accentColorAlpha: 'rgba(28, 231, 131, 0.15)',

    borderColor: '#374151',
    borderColorHover: '#4b5563',
    shadowColor: 'rgba(0, 0, 0, 0.5)',

    successColor: '#1ce783',
    warningColor: '#f59e0b',
    errorColor: '#ef4444',
    infoColor: '#06b6d4',

    hoverColor: 'rgba(255, 255, 255, 0.05)',
    activeColor: 'rgba(255, 255, 255, 0.1)',
    focusColor: '#1ce783',

    cardBackground: '#151f3d',
    modalBackground: 'rgba(11, 20, 38, 0.9)',
    overlayBackground: 'rgba(11, 20, 38, 0.7)',

    // Video Player
    videoBackground: '#000000',
    overlayBorder: 'rgba(255, 255, 255, 0.3)',
    controlProgressBg: 'rgba(255, 255, 255, 0.3)',
    controlHoverBg: 'rgba(255, 255, 255, 0.2)',
  },
};

// Apple TV+ - Elegant black and silver
const appleTv: Theme = {
  id: 'apple-tv',
  name: 'Apple TV+',
  description: 'Elegant black and silver theme inspired by Apple TV+',
  category: 'streaming',
  inspiration: 'Apple TV+',
  colors: {
    primary: '#007aff',
    primaryHover: '#0056b3',
    primaryAlpha: 'rgba(0, 122, 255, 0.1)',

    backgroundPrimary: '#000000',
    backgroundSecondary: '#1c1c1e',
    backgroundTertiary: '#2c2c2e',

    textPrimary: '#ffffff',
    textSecondary: '#d1d1d6',
    textMuted: '#8e8e93',

    accentColor: '#007aff',
    accentColorHover: '#0056b3',
    accentColorAlpha: 'rgba(0, 122, 255, 0.15)',

    borderColor: '#38383a',
    borderColorHover: '#48484a',
    shadowColor: 'rgba(0, 0, 0, 0.8)',

    successColor: '#30d158',
    warningColor: '#ff9f0a',
    errorColor: '#ff453a',
    infoColor: '#007aff',

    hoverColor: 'rgba(255, 255, 255, 0.04)',
    activeColor: 'rgba(255, 255, 255, 0.08)',
    focusColor: '#007aff',

    cardBackground: '#1c1c1e',
    modalBackground: 'rgba(0, 0, 0, 0.9)',
    overlayBackground: 'rgba(0, 0, 0, 0.6)',

    // Video Player
    videoBackground: '#000000',
    overlayBorder: 'rgba(255, 255, 255, 0.3)',
    controlProgressBg: 'rgba(255, 255, 255, 0.3)',
    controlHoverBg: 'rgba(255, 255, 255, 0.2)',
  },
};

// Amazon Prime - Blue and orange
const amazonPrime: Theme = {
  id: 'amazon-prime',
  name: 'Amazon Prime',
  description: 'Blue and orange theme inspired by Amazon Prime Video',
  category: 'streaming',
  inspiration: 'Amazon Prime Video',
  colors: {
    primary: '#00a8e1',
    primaryHover: '#0096cc',
    primaryAlpha: 'rgba(0, 168, 225, 0.1)',

    backgroundPrimary: '#0f171e',
    backgroundSecondary: '#1a252f',
    backgroundTertiary: '#232f3e',

    textPrimary: '#ffffff',
    textSecondary: '#ddd6fe',
    textMuted: '#aaa6c3',

    accentColor: '#00a8e1',
    accentColorHover: '#0096cc',
    accentColorAlpha: 'rgba(0, 168, 225, 0.15)',

    borderColor: '#344155',
    borderColorHover: '#475569',
    shadowColor: 'rgba(0, 0, 0, 0.6)',

    successColor: '#16a34a',
    warningColor: '#ea580c',
    errorColor: '#dc2626',
    infoColor: '#00a8e1',

    hoverColor: 'rgba(255, 255, 255, 0.05)',
    activeColor: 'rgba(255, 255, 255, 0.1)',
    focusColor: '#00a8e1',

    cardBackground: '#1a252f',
    modalBackground: 'rgba(15, 23, 30, 0.9)',
    overlayBackground: 'rgba(15, 23, 30, 0.7)',

    // Video Player
    videoBackground: '#000000',
    overlayBorder: 'rgba(255, 255, 255, 0.3)',
    controlProgressBg: 'rgba(255, 255, 255, 0.3)',
    controlHoverBg: 'rgba(255, 255, 255, 0.2)',
  },
};

// Spotify Dark - Green music theme
const spotifyDark: Theme = {
  id: 'spotify-dark',
  name: 'Spotify Dark',
  description: 'Music-inspired green theme based on Spotify',
  category: 'streaming',
  inspiration: 'Spotify',
  colors: {
    primary: '#1db954',
    primaryHover: '#1ed760',
    primaryAlpha: 'rgba(29, 185, 84, 0.1)',

    backgroundPrimary: '#121212',
    backgroundSecondary: '#181818',
    backgroundTertiary: '#282828',

    textPrimary: '#ffffff',
    textSecondary: '#b3b3b3',
    textMuted: '#727272',

    accentColor: '#1db954',
    accentColorHover: '#1ed760',
    accentColorAlpha: 'rgba(29, 185, 84, 0.15)',

    borderColor: '#333333',
    borderColorHover: '#404040',
    shadowColor: 'rgba(0, 0, 0, 0.5)',

    successColor: '#1db954',
    warningColor: '#ffb052',
    errorColor: '#e22134',
    infoColor: '#2e77d0',

    hoverColor: 'rgba(255, 255, 255, 0.1)',
    activeColor: 'rgba(255, 255, 255, 0.2)',
    focusColor: '#1db954',

    cardBackground: '#181818',
    modalBackground: 'rgba(0, 0, 0, 0.8)',
    overlayBackground: 'rgba(0, 0, 0, 0.6)',

    // Video Player
    videoBackground: '#000000',
    overlayBorder: 'rgba(255, 255, 255, 0.3)',
    controlProgressBg: 'rgba(255, 255, 255, 0.3)',
    controlHoverBg: 'rgba(255, 255, 255, 0.2)',
  },
};

// Plex - Orange media server theme
const plex: Theme = {
  id: 'plex',
  name: 'Plex',
  description: 'Media server theme inspired by Plex',
  category: 'streaming',
  inspiration: 'Plex Media Server',
  colors: {
    primary: '#e5a00d',
    primaryHover: '#f2b636',
    primaryAlpha: 'rgba(229, 160, 13, 0.1)',

    backgroundPrimary: '#1f1f1f',
    backgroundSecondary: '#282a2d',
    backgroundTertiary: '#393b3d',

    textPrimary: '#ffffff',
    textSecondary: '#c1c7cd',
    textMuted: '#8b9299',

    accentColor: '#e5a00d',
    accentColorHover: '#f2b636',
    accentColorAlpha: 'rgba(229, 160, 13, 0.15)',

    borderColor: '#40434a',
    borderColorHover: '#515560',
    shadowColor: 'rgba(0, 0, 0, 0.5)',

    successColor: '#27ae60',
    warningColor: '#e5a00d',
    errorColor: '#e74c3c',
    infoColor: '#3498db',

    hoverColor: 'rgba(255, 255, 255, 0.08)',
    activeColor: 'rgba(255, 255, 255, 0.15)',
    focusColor: '#e5a00d',

    cardBackground: '#282a2d',
    modalBackground: 'rgba(31, 31, 31, 0.9)',
    overlayBackground: 'rgba(31, 31, 31, 0.7)',

    // Video Player
    videoBackground: '#000000',
    overlayBorder: 'rgba(255, 255, 255, 0.3)',
    controlProgressBg: 'rgba(255, 255, 255, 0.3)',
    controlHoverBg: 'rgba(255, 255, 255, 0.2)',
  },
};

// Sofathek Custom - Unique teal and purple gradient theme
const sofathekCustom: Theme = {
  id: 'sofathek-custom',
  name: 'Sofathek Custom',
  description: 'Unique teal and purple gradient theme designed for Sofathek',
  category: 'custom',
  inspiration: 'Original Design',
  colors: {
    primary: '#06b6d4',
    primaryHover: '#0891b2',
    primaryAlpha: 'rgba(6, 182, 212, 0.1)',

    backgroundPrimary: '#0f0f23',
    backgroundSecondary: '#1e1e3f',
    backgroundTertiary: '#2a2a5c',

    textPrimary: '#f8fafc',
    textSecondary: '#cbd5e1',
    textMuted: '#94a3b8',

    accentColor: '#8b5cf6',
    accentColorHover: '#a78bfa',
    accentColorAlpha: 'rgba(139, 92, 246, 0.15)',

    borderColor: '#3f3f7a',
    borderColorHover: '#5555aa',
    shadowColor: 'rgba(0, 0, 0, 0.6)',

    successColor: '#10b981',
    warningColor: '#f59e0b',
    errorColor: '#ef4444',
    infoColor: '#06b6d4',

    hoverColor: 'rgba(248, 250, 252, 0.05)',
    activeColor: 'rgba(248, 250, 252, 0.1)',
    focusColor: '#8b5cf6',

    cardBackground: '#1e1e3f',
    modalBackground: 'rgba(15, 15, 35, 0.9)',
    overlayBackground: 'rgba(15, 15, 35, 0.7)',

    // Video Player
    videoBackground: '#000000',
    overlayBorder: 'rgba(255, 255, 255, 0.3)',
    controlProgressBg: 'rgba(255, 255, 255, 0.3)',
    controlHoverBg: 'rgba(255, 255, 255, 0.2)',
  },
};

// Export all themes
export const themes: Theme[] = [
  netflixDark,
  youtubeLight,
  disneyPlus,
  hboMax,
  hulu,
  appleTv,
  amazonPrime,
  spotifyDark,
  plex,
  sofathekCustom,
];

// Default theme
export const defaultTheme = netflixDark;

// Theme utilities
export const getThemeById = (id: string): Theme => {
  return themes.find(theme => theme.id === id) || defaultTheme;
};

export const getThemesByCategory = (
  category: 'streaming' | 'custom'
): Theme[] => {
  return themes.filter(theme => theme.category === category);
};
