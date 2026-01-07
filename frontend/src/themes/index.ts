/**
 * Sofathek Theme System
 * Complete theming solution for 10 streaming platform-inspired themes
 */

// Theme configuration and types
export * from './config';

// Theme provider and context
export { ThemeProvider, useTheme } from './ThemeProvider';

// Re-export for convenience
import {
  defaultTheme,
  themes,
  getThemeById,
  getThemesByCategory,
} from './config';
export { defaultTheme, themes, getThemeById, getThemesByCategory };
