import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: parseInt(process.env.SOFATHEK_FRONTEND_PORT || '8010', 10),
    host: true,
    proxy: {
      '/api': {
        target: `http://localhost:${process.env.SOFATHEK_BACKEND_PORT || '3010'}`,
        changeOrigin: true,
        secure: false,
      },
      '/health': {
        target: `http://localhost:${process.env.SOFATHEK_BACKEND_PORT || '3010'}`,
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})