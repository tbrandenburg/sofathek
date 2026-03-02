import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ModeToggle } from '../components/mode-toggle';
import { ThemeProvider } from '../components/theme-provider';
import React from 'react';

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  value: vi.fn().mockReturnValue({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }),
});

// Wrapper component that provides theme context
function ThemeWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider defaultTheme="system">
      {children}
    </ThemeProvider>
  );
}

describe('ModeToggle Component', () => {
  test('should render theme toggle button', () => {
    render(
      <ThemeWrapper>
        <ModeToggle />
      </ThemeWrapper>
    );

    // Should have a button with theme toggle functionality
    const toggleButton = screen.getByRole('button');
    expect(toggleButton).toBeInTheDocument();
    
    // Should have screen reader text
    expect(screen.getByText('Toggle theme')).toBeInTheDocument();
  });

  test('should display sun and moon icons', () => {
    render(
      <ThemeWrapper>
        <ModeToggle />
      </ThemeWrapper>
    );

    // Icons are rendered as SVG elements from lucide-react with aria-hidden="true"
    const toggleButton = screen.getByRole('button');
    const svgElements = toggleButton.querySelectorAll('svg');
    expect(svgElements.length).toBe(2); // Sun and Moon icons
    
    // Verify specific icon classes
    expect(toggleButton.querySelector('.lucide-sun')).toBeInTheDocument();
    expect(toggleButton.querySelector('.lucide-moon')).toBeInTheDocument();
  });

  test('should have proper accessibility attributes', () => {
    render(
      <ThemeWrapper>
        <ModeToggle />
      </ThemeWrapper>
    );

    const toggleButton = screen.getByRole('button');
    expect(toggleButton).toHaveAttribute('aria-expanded', 'false');
    expect(toggleButton).toHaveAttribute('aria-haspopup', 'menu');
  });

  test('should open dropdown when clicked', async () => {
    const user = await import('@testing-library/user-event');
    const userEvent = user.default.setup();
    
    render(
      <ThemeWrapper>
        <ModeToggle />
      </ThemeWrapper>
    );

    const toggleButton = screen.getByRole('button');
    await userEvent.click(toggleButton);

    // After clicking, dropdown should be open 
    expect(toggleButton).toHaveAttribute('aria-expanded', 'true');
  });

  test('should display theme options in dropdown menu', async () => {
    const user = await import('@testing-library/user-event');
    const userEvent = user.default.setup();
    
    render(
      <ThemeWrapper>
        <ModeToggle />
      </ThemeWrapper>
    );

    const toggleButton = screen.getByRole('button');
    await userEvent.click(toggleButton);

    // Check for theme options
    expect(screen.getByRole('menuitem', { name: 'Light' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Dark' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'System' })).toBeInTheDocument();
  });

  test('should handle theme selection', async () => {
    const user = await import('@testing-library/user-event');
    const userEvent = user.default.setup();
    
    render(
      <ThemeWrapper>
        <ModeToggle />
      </ThemeWrapper>
    );

    const toggleButton = screen.getByRole('button');
    await userEvent.click(toggleButton);

    // Click on Light theme option
    const lightOption = screen.getByRole('menuitem', { name: 'Light' });
    await userEvent.click(lightOption);

    // Verify localStorage was called to persist the theme
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('vite-ui-theme', 'light');
  });

  test('should close dropdown after theme selection', async () => {
    const user = await import('@testing-library/user-event');
    const userEvent = user.default.setup();
    
    render(
      <ThemeWrapper>
        <ModeToggle />
      </ThemeWrapper>
    );

    const toggleButton = screen.getByRole('button');
    await userEvent.click(toggleButton);

    // Select dark theme
    const darkOption = screen.getByRole('menuitem', { name: 'Dark' });
    await userEvent.click(darkOption);

    // Dropdown should close
    expect(toggleButton).toHaveAttribute('aria-expanded', 'false');
  });

  test('should have proper button styling classes', () => {
    render(
      <ThemeWrapper>
        <ModeToggle />
      </ThemeWrapper>
    );

    const toggleButton = screen.getByRole('button');
    
    // Should have shadcn/ui button variant classes
    expect(toggleButton.className).toContain('inline-flex');
    expect(toggleButton.className).toContain('items-center');
    expect(toggleButton.className).toContain('justify-center');
  });

  test('should handle keyboard navigation', async () => {
    const user = await import('@testing-library/user-event');
    const userEvent = user.default.setup();
    
    render(
      <ThemeWrapper>
        <ModeToggle />
      </ThemeWrapper>
    );

    const toggleButton = screen.getByRole('button');
    
    // Focus and press Enter to open dropdown
    toggleButton.focus();
    await userEvent.keyboard('{Enter}');

    expect(toggleButton).toHaveAttribute('aria-expanded', 'true');
    
    // Press Escape to close
    await userEvent.keyboard('{Escape}');
    expect(toggleButton).toHaveAttribute('aria-expanded', 'false');
  });
});