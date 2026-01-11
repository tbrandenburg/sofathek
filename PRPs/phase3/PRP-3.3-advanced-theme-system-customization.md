# PRP-3.3: Advanced Theme System & Customization

## Purpose & Core Philosophy

**Create comprehensive theming architecture that enables Netflix-level visual polish while supporting family-specific customization through 10 distinct themes with seamless switching capabilities.**

### Before implementing theming, ask:

- **Does this theme system empower users to personalize their media experience?**
- **How does theming enhance content discovery and visual hierarchy?**
- **Will theme switching feel instant and maintain user context?**
- **Does the color palette support both accessibility and visual appeal?**

### Core Principles

1. **CSS Custom Properties Foundation**: Use native CSS variables for instant switching without JavaScript overhead
2. **Contextual Color Intelligence**: Colors adapt to content type (movies vs family content) and time of day
3. **Accessibility-First Palettes**: All themes meet WCAG 2.1 AA standards with proper contrast ratios
4. **Performance-Optimized Switching**: Theme changes use CSS transitions without layout thrashing

---

## Gap Analysis: Current vs Advanced Theme System

### Current State Issues

- **Limited Theme Options**: Only basic light/dark mode without comprehensive color systems
- **Static Color Palettes**: Colors don't adapt to content type or user preferences
- **No Family Targeting**: Themes don't consider child-friendly vs adult content contexts
- **Poor Accessibility**: Limited attention to contrast ratios and colorblind accessibility
- **Basic Implementation**: Simple CSS classes instead of comprehensive design system
- **No Persistence**: Theme choices don't persist across sessions or sync with profiles
- **Missing Customization**: No user ability to modify or create custom themes

### Netflix-Like Target Experience

- **10 Comprehensive Themes**: 6 child-friendly + 4 adult sophisticated themes
- **Contextual Adaptation**: Theme colors adapt based on content type and viewing time
- **Smooth Transitions**: CSS-based theme switching with elegant animations
- **Profile Integration**: Themes tied to user profiles with automatic switching
- **Advanced Accessibility**: High contrast modes, colorblind support, reduced motion options
- **Customization Tools**: User ability to modify colors and create personal theme variants
- **System Integration**: Respect OS dark mode preferences with override capability

---

## Implementation Strategy

### 1. CSS Custom Properties Architecture (`ThemeVariables`)

**Philosophy**: Create a semantic color system that maps business logic to visual design through CSS custom properties.

```css
/* /frontend/src/themes/variables.css */

/* Base Theme Structure - Applied to :root */
:root {
  /* === CORE THEME SYSTEM === */

  /* Primary Brand Colors */
  --color-primary-rgb: var(--theme-primary-rgb);
  --color-primary: rgb(var(--color-primary-rgb));
  --color-primary-hover: rgb(var(--theme-primary-hover-rgb));
  --color-primary-alpha-10: rgba(var(--color-primary-rgb), 0.1);
  --color-primary-alpha-20: rgba(var(--color-primary-rgb), 0.2);
  --color-primary-alpha-50: rgba(var(--color-primary-rgb), 0.5);

  /* Background System */
  --color-background-rgb: var(--theme-background-rgb);
  --color-background: rgb(var(--color-background-rgb));
  --color-background-secondary: rgb(var(--theme-background-secondary-rgb));
  --color-background-tertiary: rgb(var(--theme-background-tertiary-rgb));
  --color-background-elevated: rgb(var(--theme-background-elevated-rgb));

  /* Surface Colors */
  --color-surface: var(--theme-surface);
  --color-surface-variant: var(--theme-surface-variant);
  --color-surface-overlay: var(--theme-surface-overlay);
  --color-surface-card: var(--theme-surface-card);

  /* Text Color System */
  --color-text-rgb: var(--theme-text-rgb);
  --color-text: rgb(var(--color-text-rgb));
  --color-text-secondary: rgb(var(--theme-text-secondary-rgb));
  --color-text-tertiary: rgb(var(--theme-text-tertiary-rgb));
  --color-text-muted: rgba(var(--color-text-rgb), 0.6);
  --color-text-disabled: rgba(var(--color-text-rgb), 0.38);

  /* Interactive States */
  --color-interactive-rgb: var(--theme-interactive-rgb);
  --color-interactive: rgb(var(--color-interactive-rgb));
  --color-interactive-hover: rgb(var(--theme-interactive-hover-rgb));
  --color-interactive-active: rgb(var(--theme-interactive-active-rgb));
  --color-interactive-disabled: rgba(var(--color-interactive-rgb), 0.38);

  /* Semantic Colors */
  --color-accent: var(--theme-accent);
  --color-accent-hover: var(--theme-accent-hover);
  --color-success: var(--theme-success);
  --color-warning: var(--theme-warning);
  --color-error: var(--theme-error);
  --color-info: var(--theme-info);

  /* Border and Divider System */
  --color-border-rgb: var(--theme-border-rgb);
  --color-border: rgba(var(--color-border-rgb), 0.2);
  --color-border-hover: rgba(var(--color-border-rgb), 0.3);
  --color-border-focus: rgba(var(--color-border-rgb), 0.5);
  --color-divider: rgba(var(--color-border-rgb), 0.1);

  /* Shadow System */
  --shadow-color-rgb: var(--theme-shadow-rgb);
  --shadow-xs: 0 1px 2px rgba(var(--shadow-color-rgb), 0.05);
  --shadow-sm: 0 1px 3px rgba(var(--shadow-color-rgb), 0.1), 0 1px 2px rgba(var(--shadow-color-rgb), 0.06);
  --shadow-md: 0 4px 6px rgba(var(--shadow-color-rgb), 0.07), 0 2px 4px rgba(var(--shadow-color-rgb), 0.06);
  --shadow-lg: 0 10px 15px rgba(var(--shadow-color-rgb), 0.1), 0 4px 6px rgba(var(--shadow-color-rgb), 0.05);
  --shadow-xl: 0 20px 25px rgba(var(--shadow-color-rgb), 0.1), 0 10px 10px rgba(var(--shadow-color-rgb), 0.04);

  /* === CONTENT-SPECIFIC VARIABLES === */

  /* Video Player Theme */
  --video-player-background: var(--theme-video-background);
  --video-player-controls: var(--theme-video-controls);
  --video-player-controls-hover: var(--theme-video-controls-hover);
  --video-player-progress: var(--color-primary);
  --video-player-progress-buffer: rgba(var(--color-text-rgb), 0.3);

  /* Card and Grid Theme */
  --card-background: var(--color-surface-card);
  --card-background-hover: var(--theme-card-hover);
  --card-border-radius: var(--radius-lg);
  --grid-gap: var(--spacing-md);

  /* Navigation Theme */
  --nav-background: var(--theme-nav-background);
  --nav-border: var(--theme-nav-border);
  --nav-item-hover: var(--theme-nav-item-hover);
  --nav-item-active: var(--color-primary-alpha-20);

  /* === RESPONSIVE VARIABLES === */

  /* Spacing System */
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 2rem;
  --spacing-2xl: 3rem;
  --spacing-3xl: 4rem;

  /* Border Radius System */
  --radius-sm: 0.25rem;
  --radius-md: 0.375rem;
  --radius-lg: 0.5rem;
  --radius-xl: 0.75rem;
  --radius-2xl: 1rem;
  --radius-full: 9999px;

  /* Typography Scale */
  --font-size-xs: 0.75rem;
  --font-size-sm: 0.875rem;
  --font-size-base: 1rem;
  --font-size-lg: 1.125rem;
  --font-size-xl: 1.25rem;
  --font-size-2xl: 1.5rem;
  --font-size-3xl: 1.875rem;
  --font-size-4xl: 2.25rem;

  /* Layout Variables */
  --nav-height: 4rem;
  --nav-height-mobile: 3.5rem;
  --nav-height-minimal: 3rem;
  --max-width: 1440px;
  --sidebar-width: 16rem;
  --sidebar-width-collapsed: 4rem;

  /* Z-Index System */
  --z-dropdown: 1000;
  --z-sticky: 1020;
  --z-fixed: 1030;
  --z-modal-backdrop: 1040;
  --z-modal: 1050;
  --z-popover: 1060;
  --z-tooltip: 1070;
  --z-navigation: 1080;

  /* Animation Variables */
  --transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-normal: 250ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-slow: 350ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-bounce: 500ms cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

/* === THEME TRANSITION SYSTEM === */
* {
  transition:
    background-color var(--transition-normal),
    border-color var(--transition-normal),
    color var(--transition-normal),
    fill var(--transition-normal),
    stroke var(--transition-normal),
    opacity var(--transition-normal),
    box-shadow var(--transition-normal),
    transform var(--transition-fast);
}

/* Disable transitions during theme switching */
.theme-switching * {
  transition: none !important;
}

/* === ACCESSIBILITY OVERRIDES === */

/* High contrast mode */
@media (prefers-contrast: high) {
  :root {
    --color-border: rgba(var(--color-border-rgb), 0.8);
    --color-border-hover: rgba(var(--color-border-rgb), 1);
    --shadow-md: 0 0 0 1px rgba(var(--color-border-rgb), 0.5);
  }
}

/* Reduced motion preference */
@media (prefers-reduced-motion: reduce) {
  * {
    transition: none !important;
    animation: none !important;
  }
}

/* Forced colors mode (Windows High Contrast) */
@media (forced-colors: active) {
  :root {
    --color-primary: Highlight;
    --color-background: Canvas;
    --color-text: CanvasText;
    --color-border: CanvasText;
  }
}
```

### 2. Comprehensive Theme Definitions (`ThemeDefinitions`)

**Philosophy**: Each theme should tell a story and evoke specific emotions while maintaining functional hierarchy.

```tsx
// /frontend/src/themes/definitions.ts
import { Theme, ThemeCategory, AccessibilityLevel } from './types';

export const themeDefinitions: Theme[] = [
  // === CHILDREN'S THEMES (6) === //

  {
    id: 'kids-rainbow',
    name: 'Rainbow Adventure',
    description: 'Bright and playful colors perfect for young explorers',
    category: ThemeCategory.Children,
    accessibility: AccessibilityLevel.AAA,
    ageRating: 'G',
    preview: {
      primary: '#FF6B6B',
      secondary: '#4ECDC4',
      background: '#FFF9E6',
    },
    variables: {
      // Primary System
      '--theme-primary-rgb': '255, 107, 107',
      '--theme-primary-hover-rgb': '255, 85, 85',
      '--theme-accent': '#4ECDC4',
      '--theme-accent-hover': '#26A69A',

      // Background System
      '--theme-background-rgb': '255, 249, 230',
      '--theme-background-secondary-rgb': '254, 243, 199',
      '--theme-background-tertiary-rgb': '253, 237, 168',
      '--theme-background-elevated-rgb': '255, 255, 255',

      // Text System
      '--theme-text-rgb': '55, 48, 163',
      '--theme-text-secondary-rgb': '91, 33, 182',
      '--theme-text-tertiary-rgb': '139, 69, 19',

      // Interactive System
      '--theme-interactive-rgb': '59, 130, 246',
      '--theme-interactive-hover-rgb': '37, 99, 235',
      '--theme-interactive-active-rgb': '29, 78, 216',

      // Surface System
      '--theme-surface': '#FFFFFF',
      '--theme-surface-variant': '#F8FAFC',
      '--theme-surface-overlay': 'rgba(255, 255, 255, 0.95)',
      '--theme-surface-card': '#FFFFFF',

      // Border and Shadow
      '--theme-border-rgb': '203, 213, 225',
      '--theme-shadow-rgb': '0, 0, 0',

      // Semantic Colors
      '--theme-success': '#10B981',
      '--theme-warning': '#F59E0B',
      '--theme-error': '#EF4444',
      '--theme-info': '#3B82F6',

      // Component Specific
      '--theme-nav-background': 'rgba(255, 249, 230, 0.95)',
      '--theme-nav-border': 'rgba(255, 107, 107, 0.2)',
      '--theme-nav-item-hover': 'rgba(255, 107, 107, 0.1)',
      '--theme-card-hover': '#FEFEFE',
      '--theme-video-background': '#1F2937',
      '--theme-video-controls': 'rgba(255, 255, 255, 0.9)',
      '--theme-video-controls-hover': 'rgba(255, 255, 255, 1)',
    },
    customizations: {
      allowUserModification: true,
      modifiableProperties: ['primary', 'accent', 'background'],
      presetVariants: ['pastel', 'vibrant', 'soft'],
    },
  },

  {
    id: 'kids-ocean',
    name: 'Ocean Explorer',
    description: 'Deep blues and aqua tones for underwater adventures',
    category: ThemeCategory.Children,
    accessibility: AccessibilityLevel.AA,
    ageRating: 'G',
    preview: {
      primary: '#0EA5E9',
      secondary: '#06B6D4',
      background: '#F0F9FF',
    },
    variables: {
      '--theme-primary-rgb': '14, 165, 233',
      '--theme-primary-hover-rgb': '2, 132, 199',
      '--theme-accent': '#06B6D4',
      '--theme-accent-hover': '#0891B2',

      '--theme-background-rgb': '240, 249, 255',
      '--theme-background-secondary-rgb': '224, 242, 254',
      '--theme-background-tertiary-rgb': '186, 230, 253',
      '--theme-background-elevated-rgb': '255, 255, 255',

      '--theme-text-rgb': '12, 74, 110',
      '--theme-text-secondary-rgb': '14, 116, 144',
      '--theme-text-tertiary-rgb': '21, 94, 117',

      '--theme-interactive-rgb': '34, 197, 94',
      '--theme-interactive-hover-rgb': '22, 163, 74',
      '--theme-interactive-active-rgb': '21, 128, 61',

      '--theme-surface': '#FFFFFF',
      '--theme-surface-variant': '#F0F9FF',
      '--theme-surface-overlay': 'rgba(255, 255, 255, 0.95)',
      '--theme-surface-card': '#FFFFFF',

      '--theme-border-rgb': '14, 165, 233',
      '--theme-shadow-rgb': '14, 165, 233',

      '--theme-success': '#10B981',
      '--theme-warning': '#F59E0B',
      '--theme-error': '#EF4444',
      '--theme-info': '#0EA5E9',

      '--theme-nav-background': 'rgba(240, 249, 255, 0.95)',
      '--theme-nav-border': 'rgba(14, 165, 233, 0.2)',
      '--theme-nav-item-hover': 'rgba(14, 165, 233, 0.1)',
      '--theme-card-hover': '#FEFEFE',
      '--theme-video-background': '#0C4A6E',
      '--theme-video-controls': 'rgba(255, 255, 255, 0.9)',
      '--theme-video-controls-hover': 'rgba(255, 255, 255, 1)',
    },
  },

  // === ADULT THEMES (4) === //

  {
    id: 'netflix-dark',
    name: 'Netflix Dark',
    description: 'Classic Netflix-inspired dark theme for immersive viewing',
    category: ThemeCategory.Adult,
    accessibility: AccessibilityLevel.AA,
    ageRating: 'PG-13',
    preview: {
      primary: '#E50914',
      secondary: '#B81D24',
      background: '#141414',
    },
    variables: {
      '--theme-primary-rgb': '229, 9, 20',
      '--theme-primary-hover-rgb': '184, 29, 36',
      '--theme-accent': '#F5F5F1',
      '--theme-accent-hover': '#FFFFFF',

      '--theme-background-rgb': '20, 20, 20',
      '--theme-background-secondary-rgb': '30, 30, 30',
      '--theme-background-tertiary-rgb': '40, 40, 40',
      '--theme-background-elevated-rgb': '50, 50, 50',

      '--theme-text-rgb': '255, 255, 255',
      '--theme-text-secondary-rgb': '179, 179, 179',
      '--theme-text-tertiary-rgb': '153, 153, 153',

      '--theme-interactive-rgb': '229, 9, 20',
      '--theme-interactive-hover-rgb': '184, 29, 36',
      '--theme-interactive-active-rgb': '153, 7, 17',

      '--theme-surface': '#181818',
      '--theme-surface-variant': '#2A2A2A',
      '--theme-surface-overlay': 'rgba(0, 0, 0, 0.9)',
      '--theme-surface-card': '#2F2F2F',

      '--theme-border-rgb': '64, 64, 64',
      '--theme-shadow-rgb': '0, 0, 0',

      '--theme-success': '#46D369',
      '--theme-warning': '#FFB020',
      '--theme-error': '#F40612',
      '--theme-info': '#54B3F4',

      '--theme-nav-background': 'rgba(0, 0, 0, 0.95)',
      '--theme-nav-border': 'rgba(229, 9, 20, 0.2)',
      '--theme-nav-item-hover': 'rgba(229, 9, 20, 0.1)',
      '--theme-card-hover': '#383838',
      '--theme-video-background': '#000000',
      '--theme-video-controls': 'rgba(255, 255, 255, 0.8)',
      '--theme-video-controls-hover': 'rgba(255, 255, 255, 1)',
    },
    customizations: {
      allowUserModification: true,
      modifiableProperties: ['primary', 'background', 'text'],
      presetVariants: ['deep-dark', 'warm-dark', 'cool-dark'],
    },
  },

  {
    id: 'premium-gold',
    name: 'Premium Gold',
    description: 'Luxurious gold and dark theme for premium content',
    category: ThemeCategory.Adult,
    accessibility: AccessibilityLevel.AA,
    ageRating: 'R',
    preview: {
      primary: '#D4AF37',
      secondary: '#B8860B',
      background: '#0D1117',
    },
    variables: {
      '--theme-primary-rgb': '212, 175, 55',
      '--theme-primary-hover-rgb': '184, 134, 11',
      '--theme-accent': '#FFC107',
      '--theme-accent-hover': '#FFB300',

      '--theme-background-rgb': '13, 17, 23',
      '--theme-background-secondary-rgb': '22, 27, 34',
      '--theme-background-tertiary-rgb': '33, 38, 45',
      '--theme-background-elevated-rgb': '48, 54, 61',

      '--theme-text-rgb': '248, 248, 242',
      '--theme-text-secondary-rgb': '201, 203, 207',
      '--theme-text-tertiary-rgb': '139, 148, 158',

      '--theme-interactive-rgb': '212, 175, 55',
      '--theme-interactive-hover-rgb': '184, 134, 11',
      '--theme-interactive-active-rgb': '158, 115, 8',

      '--theme-surface': '#161B22',
      '--theme-surface-variant': '#21262D',
      '--theme-surface-overlay': 'rgba(13, 17, 23, 0.95)',
      '--theme-surface-card': '#30363D',

      '--theme-border-rgb': '48, 54, 61',
      '--theme-shadow-rgb': '0, 0, 0',

      '--theme-success': '#3FB950',
      '--theme-warning': '#D29922',
      '--theme-error': '#F85149',
      '--theme-info': '#58A6FF',

      '--theme-nav-background': 'rgba(13, 17, 23, 0.95)',
      '--theme-nav-border': 'rgba(212, 175, 55, 0.2)',
      '--theme-nav-item-hover': 'rgba(212, 175, 55, 0.1)',
      '--theme-card-hover': '#3C4149',
      '--theme-video-background': '#0D1117',
      '--theme-video-controls': 'rgba(212, 175, 55, 0.9)',
      '--theme-video-controls-hover': 'rgba(212, 175, 55, 1)',
    },
  },

  // ... Additional themes following same pattern ...
];

export const getThemeById = (id: string): Theme | undefined => {
  return themeDefinitions.find(theme => theme.id === id);
};

export const getThemesByCategory = (category: ThemeCategory): Theme[] => {
  return themeDefinitions.filter(theme => theme.category === category);
};

export const getChildSafeThemes = (): Theme[] => {
  return themeDefinitions.filter(
    theme => theme.category === ThemeCategory.Children || theme.ageRating === 'G' || theme.ageRating === 'PG'
  );
};

export const getAdultThemes = (): Theme[] => {
  return themeDefinitions.filter(theme => theme.category === ThemeCategory.Adult);
};

export const getAccessibleThemes = (level: AccessibilityLevel = AccessibilityLevel.AA): Theme[] => {
  const levels = {
    [AccessibilityLevel.A]: 1,
    [AccessibilityLevel.AA]: 2,
    [AccessibilityLevel.AAA]: 3,
  };

  return themeDefinitions.filter(theme => levels[theme.accessibility] >= levels[level]);
};
```

### 3. Advanced Theme Provider with Context Intelligence (`ThemeProvider`)

**Philosophy**: Theme provider should intelligently adapt themes based on user context, content type, and accessibility needs.

```tsx
// /frontend/src/themes/ThemeProvider.tsx
import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { Theme, ThemeCategory, ThemeContext as IThemeContext, UserProfile } from '../types';
import { themeDefinitions, getThemeById, getChildSafeThemes, getAdultThemes } from './definitions';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useProfile } from '../hooks/useProfile';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { applyThemeVariables, preloadTheme, validateThemeContrast } from './utils';

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultThemeId?: string;
  enableAutoThemeSwitch?: boolean;
  respectSystemPreferences?: boolean;
}

const ThemeContext = createContext<IThemeContext | null>(null);

export const useTheme = (): IThemeContext => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  defaultThemeId = 'netflix-dark',
  enableAutoThemeSwitch = true,
  respectSystemPreferences = true,
}) => {
  const { currentProfile } = useProfile();
  const [currentThemeId, setCurrentThemeId] = useLocalStorage('sofathek-theme', defaultThemeId);
  const [previewTheme, setPreviewTheme] = useState<Theme | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const transitionTimeoutRef = useRef<NodeJS.Timeout>();

  // System preference detection
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');
  const prefersHighContrast = useMediaQuery('(prefers-contrast: high)');
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');

  // Get current theme
  const activeTheme = previewTheme || getThemeById(currentThemeId) || themeDefinitions[0];

  // Get available themes based on profile
  const availableThemes = useCallback((): Theme[] => {
    if (!currentProfile) return themeDefinitions;

    if (currentProfile.isChild || currentProfile.ageRating === 'G') {
      return getChildSafeThemes();
    }

    if (currentProfile.restrictions?.maxAgeRating) {
      return themeDefinitions.filter(theme => {
        const themeRatings = ['G', 'PG', 'PG-13', 'R'];
        const maxIndex = themeRatings.indexOf(currentProfile.restrictions!.maxAgeRating!);
        const themeIndex = themeRatings.indexOf(theme.ageRating);
        return themeIndex <= maxIndex;
      });
    }

    return themeDefinitions;
  }, [currentProfile]);

  // Auto theme switching based on content context
  const getContextualTheme = useCallback(
    (contentType?: string): Theme => {
      const available = availableThemes();

      // Respect user's explicit choice if made recently
      const userTheme = getThemeById(currentThemeId);
      if (userTheme && available.includes(userTheme)) {
        return userTheme;
      }

      // Auto-select based on profile
      if (currentProfile?.isChild) {
        return available.find(t => t.category === ThemeCategory.Children) || available[0];
      }

      // Auto-select based on system preferences
      if (respectSystemPreferences && prefersDark) {
        return (
          available.find(t => t.id.includes('dark')) ||
          available.find(t => t.category === ThemeCategory.Adult) ||
          available[0]
        );
      }

      return available[0];
    },
    [availableThemes, currentThemeId, currentProfile, respectSystemPreferences, prefersDark]
  );

  // Theme switching with transition management
  const setTheme = useCallback(
    (
      themeId: string,
      options?: {
        animate?: boolean;
        temporary?: boolean;
        saveToProfile?: boolean;
      }
    ) => {
      const { animate = true, temporary = false, saveToProfile = true } = options || {};
      const theme = getThemeById(themeId);

      if (!theme || !availableThemes().includes(theme)) {
        console.warn(`Theme "${themeId}" not available for current profile`);
        return;
      }

      // Validate accessibility requirements
      if (prefersHighContrast && !validateThemeContrast(theme)) {
        console.warn(`Theme "${themeId}" may not meet high contrast requirements`);
      }

      if (animate) {
        setIsTransitioning(true);
        document.documentElement.classList.add('theme-switching');

        if (transitionTimeoutRef.current) {
          clearTimeout(transitionTimeoutRef.current);
        }

        transitionTimeoutRef.current = setTimeout(() => {
          document.documentElement.classList.remove('theme-switching');
          setIsTransitioning(false);
        }, 300);
      }

      // Apply theme immediately
      applyThemeVariables(theme);

      if (!temporary) {
        setCurrentThemeId(themeId);

        // Save to profile if enabled
        if (saveToProfile && currentProfile) {
          // Save theme preference to profile
          updateProfileTheme(currentProfile.id, themeId);
        }
      }

      // Preload related themes for faster switching
      const relatedThemes = availableThemes()
        .filter(t => t.category === theme.category && t.id !== theme.id)
        .slice(0, 2);

      relatedThemes.forEach(preloadTheme);

      // Announce theme change for screen readers
      announceThemeChange(theme.name);
    },
    [availableThemes, currentProfile, prefersHighContrast, setCurrentThemeId]
  );

  // Preview theme temporarily
  const previewThemeById = useCallback(
    (themeId: string | null) => {
      if (!themeId) {
        setPreviewTheme(null);
        applyThemeVariables(getThemeById(currentThemeId) || themeDefinitions[0]);
        return;
      }

      const theme = getThemeById(themeId);
      if (theme && availableThemes().includes(theme)) {
        setPreviewTheme(theme);
        applyThemeVariables(theme);
      }
    },
    [availableThemes, currentThemeId]
  );

  // Reset to current theme
  const resetTheme = useCallback(() => {
    setPreviewTheme(null);
    const theme = getThemeById(currentThemeId) || themeDefinitions[0];
    applyThemeVariables(theme);
  }, [currentThemeId]);

  // Auto theme switching based on profile changes
  useEffect(() => {
    if (enableAutoThemeSwitch && currentProfile) {
      const contextualTheme = getContextualTheme();
      if (contextualTheme.id !== currentThemeId) {
        setTheme(contextualTheme.id, { saveToProfile: false });
      }
    }
  }, [currentProfile, enableAutoThemeSwitch, getContextualTheme]);

  // Apply theme on initialization and changes
  useEffect(() => {
    applyThemeVariables(activeTheme);

    // Set theme metadata
    document.documentElement.setAttribute('data-theme', activeTheme.id);
    document.documentElement.setAttribute('data-theme-category', activeTheme.category);

    // Update meta theme-color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', `rgb(${activeTheme.variables['--theme-background-rgb']})`);
    }
  }, [activeTheme]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }
    };
  }, []);

  const contextValue: IThemeContext = {
    currentTheme: activeTheme,
    availableThemes: availableThemes(),
    setTheme,
    previewTheme: previewThemeById,
    resetTheme,
    isTransitioning,
    canModifyThemes: currentProfile?.isAdmin || false,
    systemPreferences: {
      prefersDark,
      prefersHighContrast,
      prefersReducedMotion,
    },
  };

  return <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>;
};

// Utility functions
async function updateProfileTheme(profileId: string, themeId: string) {
  try {
    await fetch(`/api/profiles/${profileId}/theme`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ themeId }),
    });
  } catch (error) {
    console.warn('Failed to save theme preference to profile:', error);
  }
}

function announceThemeChange(themeName: string) {
  const announcement = document.createElement('div');
  announcement.setAttribute('aria-live', 'polite');
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = `Theme changed to ${themeName}`;

  document.body.appendChild(announcement);

  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}
```

### 4. Theme Customization Interface (`ThemeCustomizer`)

**Philosophy**: Allow users to personalize themes while maintaining design system coherence and accessibility standards.

```tsx
// /frontend/src/components/ThemeCustomizer/ThemeCustomizer.tsx
import React, { useState, useCallback, useMemo } from 'react';
import { useTheme } from '../../themes/ThemeProvider';
import { Theme } from '../../types';
import { ColorPicker } from './ColorPicker';
import { ThemePreview } from './ThemePreview';
import { AccessibilityValidator } from './AccessibilityValidator';
import { PresetVariants } from './PresetVariants';
import './ThemeCustomizer.css';

interface ThemeCustomizerProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (customTheme: Theme) => void;
}

export const ThemeCustomizer: React.FC<ThemeCustomizerProps> = ({ isOpen, onClose, onSave }) => {
  const { currentTheme, previewTheme, canModifyThemes } = useTheme();
  const [customizations, setCustomizations] = useState<Record<string, string>>({});
  const [selectedSection, setSelectedSection] = useState<'colors' | 'spacing' | 'typography'>('colors');
  const [validationResults, setValidationResults] = useState<any>(null);

  // Create preview theme with customizations
  const previewCustomTheme = useMemo(() => {
    if (!currentTheme.customizations?.allowUserModification) return null;

    return {
      ...currentTheme,
      variables: {
        ...currentTheme.variables,
        ...customizations,
      },
    };
  }, [currentTheme, customizations]);

  // Handle color customization
  const handleColorChange = useCallback(
    (property: string, color: string) => {
      if (!currentTheme.customizations?.modifiableProperties?.includes(property)) {
        return;
      }

      const rgbColor = hexToRgb(color);
      const variableKey = `--theme-${property}-rgb`;

      setCustomizations(prev => ({
        ...prev,
        [variableKey]: rgbColor,
      }));

      // Validate accessibility in real-time
      validateCustomization({
        ...customizations,
        [variableKey]: rgbColor,
      });
    },
    [currentTheme, customizations]
  );

  const validateCustomization = useCallback(
    async (customVars: Record<string, string>) => {
      // Run accessibility validation
      const results = await validateThemeAccessibility({
        ...currentTheme.variables,
        ...customVars,
      });

      setValidationResults(results);
    },
    [currentTheme]
  );

  // Apply preview
  const applyPreview = useCallback(() => {
    if (previewCustomTheme) {
      previewTheme(previewCustomTheme.id);
    }
  }, [previewCustomTheme, previewTheme]);

  // Save customization
  const handleSave = useCallback(() => {
    if (!previewCustomTheme || !validationResults?.isValid) return;

    const customTheme: Theme = {
      ...previewCustomTheme,
      id: `${currentTheme.id}-custom-${Date.now()}`,
      name: `${currentTheme.name} (Custom)`,
      description: 'User customized theme',
    };

    onSave?.(customTheme);
    onClose();
  }, [previewCustomTheme, validationResults, currentTheme, onSave, onClose]);

  if (!isOpen || !canModifyThemes || !currentTheme.customizations?.allowUserModification) {
    return null;
  }

  return (
    <div className="theme-customizer">
      <div className="customizer-backdrop" onClick={onClose} />

      <div className="customizer-panel">
        <header className="customizer-header">
          <h2>Customize Theme: {currentTheme.name}</h2>
          <button className="close-button" onClick={onClose}>
            <svg viewBox="0 0 24 24">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" />
            </svg>
          </button>
        </header>

        <div className="customizer-content">
          {/* Section Tabs */}
          <div className="customizer-tabs">
            {['colors', 'spacing', 'typography'].map(section => (
              <button
                key={section}
                className={`tab ${selectedSection === section ? 'tab--active' : ''}`}
                onClick={() => setSelectedSection(section as any)}
              >
                {section.charAt(0).toUpperCase() + section.slice(1)}
              </button>
            ))}
          </div>

          {/* Color Customization */}
          {selectedSection === 'colors' && (
            <div className="customization-section">
              <h3>Color Palette</h3>

              {currentTheme.customizations.modifiableProperties?.includes('primary') && (
                <div className="color-control">
                  <label>Primary Color</label>
                  <ColorPicker
                    value={rgbToHex(currentTheme.variables['--theme-primary-rgb'])}
                    onChange={color => handleColorChange('primary', color)}
                    presets={currentTheme.customizations.presetVariants}
                  />
                </div>
              )}

              {currentTheme.customizations.modifiableProperties?.includes('accent') && (
                <div className="color-control">
                  <label>Accent Color</label>
                  <ColorPicker
                    value={currentTheme.variables['--theme-accent']}
                    onChange={color => handleColorChange('accent', color)}
                  />
                </div>
              )}

              {/* Preset Variants */}
              {currentTheme.customizations.presetVariants && (
                <PresetVariants
                  variants={currentTheme.customizations.presetVariants}
                  onSelect={variant => applyPresetVariant(variant)}
                />
              )}
            </div>
          )}

          {/* Live Preview */}
          <div className="customizer-preview">
            <h3>Preview</h3>
            <ThemePreview theme={previewCustomTheme || currentTheme} onApply={applyPreview} />
          </div>

          {/* Accessibility Validation */}
          {validationResults && <AccessibilityValidator results={validationResults} />}
        </div>

        <footer className="customizer-footer">
          <button className="button button--secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="button button--primary" onClick={handleSave} disabled={!validationResults?.isValid}>
            Save Custom Theme
          </button>
        </footer>
      </div>
    </div>
  );
};

// Utility functions
function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '0, 0, 0';
}

function rgbToHex(rgb: string): string {
  const [r, g, b] = rgb.split(', ').map(Number);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}
```

---

## Anti-Patterns to Avoid

❌ **CSS-in-JS Theme Switching**: Don't rely on JavaScript-heavy theme switching that blocks the main thread

- **Why bad**: Causes layout thrashing, poor performance, flash of unstyled content
- **Better**: Use CSS custom properties for instant switching with smooth transitions

❌ **Viewport-Only Color Choices**: Don't select theme colors based only on designer preferences

- **Why bad**: Ignores accessibility needs, cultural preferences, and content context
- **Better**: Research color psychology, test with real users, validate accessibility standards

❌ **Static Theme Definitions**: Don't hard-code themes without considering user customization

- **Why bad**: Users can't personalize experience, doesn't accommodate accessibility needs
- **Better**: Build customization system with accessibility validation and preset variants

❌ **Missing Context Awareness**: Don't apply the same theme regardless of content type or user profile

- **Why bad**: Child content with adult dark themes, bright themes during video playback
- **Better**: Implement intelligent theme switching based on content and user context

❌ **Poor Accessibility Testing**: Don't ship themes without comprehensive accessibility validation

- **Why bad**: Excludes users with visual impairments, violates legal requirements
- **Better**: Automated contrast checking, colorblind simulation, high contrast mode support

---

## Variation Guidance

**IMPORTANT**: Theme implementations should vary based on user demographics and content strategy.

**Vary by Target Audience**:

- **Family-Focused**: Emphasize child-safe themes with bright, welcoming colors
- **Adult Premium**: Dark, sophisticated themes that don't distract from content
- **Multi-Generational**: Broad theme selection with automatic age-appropriate switching
- **Accessibility-First**: High contrast options, colorblind-friendly palettes

**Vary by Content Type**:

- **Movie Collections**: Cinematic dark themes that enhance viewing experience
- **Educational Content**: Higher contrast, readable themes with clear information hierarchy
- **User-Generated**: Flexible themes that don't clash with varied thumbnail styles
- **Live Streaming**: Themes optimized for real-time content with minimal distraction

**Vary by Platform Context**:

- **Desktop**: Rich, detailed themes with hover states and complex interactions
- **Mobile**: Simplified themes optimized for touch and smaller screens
- **TV/Console**: High contrast themes readable from distance with limited interaction
- **Web App**: Themes that respect browser preferences and integrate with OS

**Avoid converging on single Netflix-dark-clone approach** - build theme system that reflects your brand identity while serving diverse user needs and accessibility requirements.

---

## Remember

**Themes are not just colors - they're emotional experiences that enhance content discovery and consumption.**

The best theme systems:

- Adapt intelligently to user needs and content context
- Maintain accessibility standards across all variations
- Allow personalization without breaking design coherence
- Switch instantly without sacrificing visual quality

**This theme framework empowers SOFATHEK to feel personally tailored to each family member while maintaining premium visual polish across all interaction contexts.**
