import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: false,
    host: '127.0.0.1',
    hmr: {
      host: '127.0.0.1',
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'lucide-react', 'canvas-confetti'],
  },
  build: {
    target: 'esnext',
  },
})
