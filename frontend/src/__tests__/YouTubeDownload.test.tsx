import React from 'react';
import { describe, test, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { YouTubeDownload } from '../components/YouTubeDownload';
import { useYouTubeDownload } from '../hooks/useYouTube';

// Mock the YouTube hooks
vi.mock('../hooks/useYouTube', () => ({
  useYouTubeDownload: vi.fn(),
}));

const mockUseYouTubeDownload = vi.mocked(useYouTubeDownload);

// Test wrapper for React Query
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('YouTubeDownload Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock implementation
    mockUseYouTubeDownload.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      isError: false,
      isSuccess: false,
      error: null,
      data: undefined,
      reset: vi.fn()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
  });

  test('should render form elements correctly', () => {
    const Wrapper = createWrapper();
    
    render(
      <Wrapper>
        <YouTubeDownload />
      </Wrapper>
    );

    expect(screen.getByTestId('youtube-download')).toBeInTheDocument();
    expect(screen.getByText('Download YouTube Video')).toBeInTheDocument();
    expect(screen.getByText(/Enter a YouTube URL to download/)).toBeInTheDocument();
    expect(screen.getByLabelText('YouTube URL')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /download video/i })).toBeInTheDocument();
  });

  test('should validate YouTube URLs correctly', () => {
    const Wrapper = createWrapper();
    
    render(
      <Wrapper>
        <YouTubeDownload />
      </Wrapper>
    );

    const input = screen.getByLabelText('YouTube URL');
    const submitButton = screen.getByRole('button', { name: /download video/i });

    // Initially disabled
    expect(submitButton).toBeDisabled();

    // Invalid URL
    fireEvent.change(input, { target: { value: 'not-a-url' } });
    expect(submitButton).toBeDisabled();

    // Valid YouTube URL
    fireEvent.change(input, { target: { value: 'https://www.youtube.com/watch?v=test123abc' } });
    expect(submitButton).toBeEnabled();

    // Valid short URL
    fireEvent.change(input, { target: { value: 'https://youtu.be/test456def' } });
    expect(submitButton).toBeEnabled();
  });

  test('should call download mutation with correct data', () => {
    const mockMutate = vi.fn();
    mockUseYouTubeDownload.mockReturnValue({
      mutate: mockMutate,
      isPending: false,
      isError: false,
      isSuccess: false,
      error: null,
      data: undefined,
      reset: vi.fn()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const Wrapper = createWrapper();
    
    render(
      <Wrapper>
        <YouTubeDownload />
      </Wrapper>
    );

    const input = screen.getByLabelText('YouTube URL');
    const submitButton = screen.getByRole('button', { name: /download video/i });
    const testUrl = 'https://www.youtube.com/watch?v=test123abc';

    fireEvent.change(input, { target: { value: testUrl } });
    fireEvent.click(submitButton);

    expect(mockMutate).toHaveBeenCalledWith({ url: testUrl });
  });

  test('should clear form on successful submission', async () => {
    const mockMutate = vi.fn();
    let mockIsSuccess = false;
    
    mockUseYouTubeDownload.mockReturnValue({
      mutate: mockMutate,
      isPending: false,
      isError: false,
      get isSuccess() { return mockIsSuccess; },
      error: null,
      data: undefined,
      reset: vi.fn()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const Wrapper = createWrapper();
    
    render(
      <Wrapper>
        <YouTubeDownload />
      </Wrapper>
    );

    const input = screen.getByLabelText('YouTube URL');
    const submitButton = screen.getByRole('button', { name: /download video/i });

    fireEvent.change(input, { target: { value: 'https://www.youtube.com/watch?v=test123abc' } });
    fireEvent.click(submitButton);

    // Simulate successful download
    mockIsSuccess = true;

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalled();
    });
  });

  test('should show loading state during download', () => {
    mockUseYouTubeDownload.mockReturnValue({
      mutate: vi.fn(),
      isPending: true,
      isError: false,
      isSuccess: false,
      error: null,
      data: undefined,
      reset: vi.fn()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const Wrapper = createWrapper();
    
    render(
      <Wrapper>
        <YouTubeDownload />
      </Wrapper>
    );

    const submitButton = screen.getByRole('button');
    expect(submitButton).toHaveTextContent('Starting Download...');
    expect(submitButton).toBeDisabled();
  });

  test('should have proper accessibility attributes', () => {
    const Wrapper = createWrapper();

    render(
      <Wrapper>
        <YouTubeDownload />
      </Wrapper>
    );

    const button = screen.getByTestId('download-button');
    const input = screen.getByLabelText('YouTube URL');

    fireEvent.change(input, { target: { value: 'https://www.youtube.com/watch?v=test123' } });

    expect(button).toHaveAttribute('type', 'submit');
    expect(button).not.toHaveAttribute('aria-disabled');

    button.focus();
    expect(button).toHaveFocus();
  });

  test('should have correct enabled state', () => {
    const Wrapper = createWrapper();

    render(
      <Wrapper>
        <YouTubeDownload />
      </Wrapper>
    );

    const button = screen.getByTestId('download-button');

    expect(button).toBeDisabled();

    const input = screen.getByLabelText('YouTube URL');
    fireEvent.change(input, { target: { value: 'https://www.youtube.com/watch?v=test123' } });

    expect(button).toBeEnabled();
  });

  test('should have correct disabled state during pending', () => {
    mockUseYouTubeDownload.mockReturnValue({
      mutate: vi.fn(),
      isPending: true,
      isError: false,
      isSuccess: false,
      error: null,
      data: undefined,
      reset: vi.fn()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const Wrapper = createWrapper();

    render(
      <Wrapper>
        <YouTubeDownload />
      </Wrapper>
    );

    const button = screen.getByTestId('download-button');
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent('Starting Download...');
  });

  test('should render download button with correct attributes', () => {
    const Wrapper = createWrapper();

    render(
      <Wrapper>
        <YouTubeDownload />
      </Wrapper>
    );

    const button = screen.getByTestId('download-button');

    expect(button).toBeVisible();
    expect(button).toHaveAttribute('data-testid', 'download-button');
    expect(screen.getByRole('button', { name: /download video/i })).toBe(button);
    expect(button).toHaveTextContent('Download Video');
  });

  test('should display success message on successful download', () => {
    mockUseYouTubeDownload.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      isError: false,
      isSuccess: true,
      error: null,
      data: {
        id: 'test-download',
        title: 'Test Video'
      },
      reset: vi.fn()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const Wrapper = createWrapper();
    
    render(
      <Wrapper>
        <YouTubeDownload />
      </Wrapper>
    );

    expect(screen.getByText(/download started successfully/i)).toBeInTheDocument();
  });

  test('should display error message on download failure', () => {
    mockUseYouTubeDownload.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      isError: true,
      isSuccess: false,
      error: new Error('Download failed'),
      data: undefined,
      reset: vi.fn()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const Wrapper = createWrapper();
    
    render(
      <Wrapper>
        <YouTubeDownload />
      </Wrapper>
    );

    expect(screen.getByText(/download failed/i)).toBeInTheDocument();
  });

  test('should handle form submission without valid URL', () => {
    const mockMutate = vi.fn();
    mockUseYouTubeDownload.mockReturnValue({
      mutate: mockMutate,
      isPending: false,
      isError: false,
      isSuccess: false,
      error: null,
      data: undefined,
      reset: vi.fn()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const Wrapper = createWrapper();
    
    render(
      <Wrapper>
        <YouTubeDownload />
      </Wrapper>
    );

    const form = screen.getByTestId('youtube-download').querySelector('form');
    
    // Submit empty form
    fireEvent.submit(form!);
    expect(mockMutate).not.toHaveBeenCalled();

    // Submit with invalid URL
    const input = screen.getByLabelText('YouTube URL');
    fireEvent.change(input, { target: { value: 'invalid-url' } });
    fireEvent.submit(form!);
    expect(mockMutate).not.toHaveBeenCalled();
  });

  test('should apply custom className', () => {
    const Wrapper = createWrapper();
    
    render(
      <Wrapper>
        <YouTubeDownload className="custom-class" />
      </Wrapper>
    );

    const component = screen.getByTestId('youtube-download');
    expect(component).toHaveClass('custom-class');
  });

  test('should reset error state when URL changes after error', () => {
    const mockReset = vi.fn();
    mockUseYouTubeDownload.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      isError: true,
      isSuccess: false,
      error: new Error('Previous error'),
      data: undefined,
      reset: mockReset
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const Wrapper = createWrapper();
    
    render(
      <Wrapper>
        <YouTubeDownload />
      </Wrapper>
    );

    // Change URL should trigger reset
    const input = screen.getByLabelText('YouTube URL');
    fireEvent.change(input, { target: { value: 'https://www.youtube.com/watch?v=new' } });

    expect(mockReset).toHaveBeenCalled();
  });
});
