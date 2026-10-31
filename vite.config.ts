import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  base: '/DBCanvas/',
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    host: 'localhost',
    watch: {
      usePolling: false,
    },
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      port: 5173,
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'lucide-react', 'canvas-confetti'],
  },
  build: {
    target: 'esnext',
  },
})
