import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
    exclude: ['tests/**/*', 'node_modules/**/*'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        'src/__tests__/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/coverage/',
        '**/dist/',
        '**/.{idea,git,cache,output,temp}/',
        '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*'
      ],
      include: ['src/**/*.{ts,tsx}'],
      thresholds: {
        global: {
          branches: 40,
          functions: 40,
          lines: 40,
          statements: 40
        },
        // Specific thresholds for YouTube functionality
        'src/services/youtube.ts': {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        },
        'src/hooks/useYouTube.ts': {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70
        },
        'src/components/YouTubeDownload.tsx': {
          branches: 60,
          functions: 60,
          lines: 60,
          statements: 60
        },
        'src/components/DownloadQueue.tsx': {
          branches: 60,
          functions: 60,
          lines: 60,
          statements: 60
        }
      }
    }
  },
})