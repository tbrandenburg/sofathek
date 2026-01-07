import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import { Theme, themes, defaultTheme, getThemeById } from './config';

interface ThemeContextType {
  currentTheme: Theme;
  setTheme: (themeId: string) => void;
  toggleTheme: () => void;
  availableThemes: Theme[];
  isLoading: boolean;
  previewTheme?: Theme;
  setPreviewTheme: (theme: Theme | undefined) => void;
  resetToCurrentTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Custom hook to use theme context
export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
  defaultThemeId?: string;
}

// Apply theme CSS variables to the root element
const applyThemeToRoot = (theme: Theme) => {
  const root = document.documentElement;
  const { colors } = theme;

  // Apply all color variables
  Object.entries(colors).forEach(([key, value]) => {
    // Convert camelCase to kebab-case for CSS variables
    const cssVariableName = `--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
    root.style.setProperty(cssVariableName, value);
  });

  // Set theme meta information
  root.setAttribute('data-theme', theme.id);
  root.setAttribute('data-theme-category', theme.category);

  // Update meta theme-color for mobile browsers
  let metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (!metaThemeColor) {
    metaThemeColor = document.createElement('meta');
    metaThemeColor.setAttribute('name', 'theme-color');
    document.head.appendChild(metaThemeColor);
  }
  metaThemeColor.setAttribute('content', colors.backgroundPrimary);
};

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  defaultThemeId = defaultTheme.id,
}) => {
  const [currentTheme, setCurrentTheme] = useState<Theme>(defaultTheme);
  const [previewTheme, setPreviewTheme] = useState<Theme | undefined>(
    undefined
  );
  const [isLoading, setIsLoading] = useState(true);

  // Load saved theme from localStorage on mount
  useEffect(() => {
    const loadSavedTheme = () => {
      try {
        const savedThemeId = localStorage.getItem('sofathek-theme');
        if (savedThemeId) {
          const theme = getThemeById(savedThemeId);
          setCurrentTheme(theme);
          applyThemeToRoot(theme);
        } else {
          // Use default theme
          const theme = getThemeById(defaultThemeId);
          setCurrentTheme(theme);
          applyThemeToRoot(theme);
        }
      } catch (error) {
        console.error('Failed to load saved theme:', error);
        // Fallback to default theme
        setCurrentTheme(defaultTheme);
        applyThemeToRoot(defaultTheme);
      } finally {
        setIsLoading(false);
      }
    };

    loadSavedTheme();
  }, [defaultThemeId]);

  // Apply preview theme or current theme
  useEffect(() => {
    const themeToApply = previewTheme || currentTheme;
    applyThemeToRoot(themeToApply);
  }, [currentTheme, previewTheme]);

  const setTheme = (themeId: string) => {
    const newTheme = getThemeById(themeId);
    setCurrentTheme(newTheme);

    // Save to localStorage
    try {
      localStorage.setItem('sofathek-theme', themeId);
    } catch (error) {
      console.error('Failed to save theme to localStorage:', error);
    }

    // Clear preview if it was set
    if (previewTheme) {
      setPreviewTheme(undefined);
    }
  };

  const toggleTheme = () => {
    const currentIndex = themes.findIndex(
      theme => theme.id === currentTheme.id
    );
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex].id);
  };

  const resetToCurrentTheme = () => {
    setPreviewTheme(undefined);
  };

  const contextValue: ThemeContextType = {
    currentTheme,
    setTheme,
    toggleTheme,
    availableThemes: themes,
    isLoading,
    previewTheme,
    setPreviewTheme,
    resetToCurrentTheme,
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};
