import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Set base path for deployment - change this if deploying to a subdirectory
  // For root domain, use '/'
  // For subdirectory like /billing-software/, use '/billing-software/'
  base: '/',
  
  // Build configuration
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: undefined
      }
    }
  },
  
  // Server configuration for local development
  server: {
    port: 5173,
    open: true
  },
  
  // Preview configuration for testing production build
  preview: {
    port: 4173,
    open: true
  }
})
