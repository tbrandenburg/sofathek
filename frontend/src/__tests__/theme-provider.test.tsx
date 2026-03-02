import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { ThemeProvider, useTheme } from '../components/theme-provider';
import React from 'react';

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

// Mock matchMedia for system theme detection
const mockMatchMedia = vi.fn();
Object.defineProperty(window, 'matchMedia', {
  value: mockMatchMedia,
  writable: true,
});

// Test component that uses the theme
function TestComponent() {
  const { theme, setTheme } = useTheme();
  
  return (
    <div>
      <span data-testid="current-theme">{theme}</span>
      <button data-testid="set-light" onClick={() => setTheme("light")}>
        Light
      </button>
      <button data-testid="set-dark" onClick={() => setTheme("dark")}>
        Dark  
      </button>
      <button data-testid="set-system" onClick={() => setTheme("system")}>
        System
      </button>
    </div>
  );
}

describe('ThemeProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset localStorage
    mockLocalStorage.getItem.mockReturnValue(null);
    // Reset matchMedia
    mockMatchMedia.mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test('should provide default theme when no stored theme exists', () => {
    mockLocalStorage.getItem.mockReturnValue(null);
    
    render(
      <ThemeProvider defaultTheme="dark">
        <TestComponent />
      </ThemeProvider>
    );

    expect(screen.getByTestId('current-theme')).toHaveTextContent('dark');
  });

  test('should use stored theme from localStorage', () => {
    mockLocalStorage.getItem.mockReturnValue('light');
    
    render(
      <ThemeProvider defaultTheme="dark">
        <TestComponent />
      </ThemeProvider>
    );

    expect(screen.getByTestId('current-theme')).toHaveTextContent('light');
    expect(mockLocalStorage.getItem).toHaveBeenCalledWith('vite-ui-theme');
  });

  test('should persist theme changes to localStorage', async () => {
    mockLocalStorage.getItem.mockReturnValue('dark');
    
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    const lightButton = screen.getByTestId('set-light');
    
    await act(async () => {
      lightButton.click();
    });

    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('vite-ui-theme', 'light');
    expect(screen.getByTestId('current-theme')).toHaveTextContent('light');
  });

  test('should handle system theme detection when theme is system', () => {
    mockLocalStorage.getItem.mockReturnValue('system');
    mockMatchMedia.mockReturnValue({
      matches: true, // Dark mode preferred
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });

    const documentElement = document.documentElement;
    const addClassSpy = vi.spyOn(documentElement.classList, 'add');
    const removeClassSpy = vi.spyOn(documentElement.classList, 'remove');
    
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    expect(removeClassSpy).toHaveBeenCalledWith('light', 'dark');
    expect(addClassSpy).toHaveBeenCalledWith('dark');
    expect(mockMatchMedia).toHaveBeenCalledWith('(prefers-color-scheme: dark)');
  });

  test('should apply light class when system preference is light', () => {
    mockLocalStorage.getItem.mockReturnValue('system');
    mockMatchMedia.mockReturnValue({
      matches: false, // Light mode preferred 
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });

    const documentElement = document.documentElement;
    const addClassSpy = vi.spyOn(documentElement.classList, 'add');
    const removeClassSpy = vi.spyOn(documentElement.classList, 'remove');
    
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    expect(removeClassSpy).toHaveBeenCalledWith('light', 'dark');
    expect(addClassSpy).toHaveBeenCalledWith('light');
  });

  test('should apply theme class directly when not system theme', () => {
    mockLocalStorage.getItem.mockReturnValue('dark');

    const documentElement = document.documentElement;
    const addClassSpy = vi.spyOn(documentElement.classList, 'add');
    const removeClassSpy = vi.spyOn(documentElement.classList, 'remove');
    
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    expect(removeClassSpy).toHaveBeenCalledWith('light', 'dark');
    expect(addClassSpy).toHaveBeenCalledWith('dark');
  });

  test('should use custom storageKey', async () => {
    mockLocalStorage.getItem.mockReturnValue('light');
    
    render(
      <ThemeProvider storageKey="custom-theme-key">
        <TestComponent />
      </ThemeProvider>
    );

    expect(mockLocalStorage.getItem).toHaveBeenCalledWith('custom-theme-key');

    const darkButton = screen.getByTestId('set-dark');
    await act(async () => {
      darkButton.click();
    });

    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('custom-theme-key', 'dark');
  });

  test('should throw error when useTheme is used outside ThemeProvider', () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    function InvalidComponent() {
      useTheme(); // This should throw
      return <div>Invalid</div>;
    }

    expect(() => {
      render(<InvalidComponent />);
    }).toThrow('useTheme must be used within a ThemeProvider');
    
    consoleSpy.mockRestore();
  });

  test('should handle theme switching through all options', async () => {
    mockLocalStorage.getItem.mockReturnValue('system');
    
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    // Start with system
    expect(screen.getByTestId('current-theme')).toHaveTextContent('system');

    // Switch to light
    const lightButton = screen.getByTestId('set-light');
    await act(async () => {
      lightButton.click();
    });
    expect(screen.getByTestId('current-theme')).toHaveTextContent('light');

    // Switch to dark
    const darkButton = screen.getByTestId('set-dark');
    await act(async () => {
      darkButton.click();
    });
    expect(screen.getByTestId('current-theme')).toHaveTextContent('dark');

    // Back to system
    const systemButton = screen.getByTestId('set-system');
    await act(async () => {
      systemButton.click();
    });
    expect(screen.getByTestId('current-theme')).toHaveTextContent('system');
  });
});