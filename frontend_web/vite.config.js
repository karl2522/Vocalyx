import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Use Vite's built-in esbuild to drop console/debugger in production builds
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'esbuild',
  },
  // Only drop console/debugger for production builds
  esbuild: mode === 'production' ? { drop: ['console', 'debugger'] } : {},
  server: {
    port: process.env.PORT || 5173,
    host: '0.0.0.0',
  }
}))