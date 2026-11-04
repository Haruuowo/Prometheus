import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  envDir: '..',
  server: {
    port: 5173,
    proxy: {
      '/brain': { target: 'http://127.0.0.1:8085', changeOrigin: true },
      '/api': { target: 'http://127.0.0.1:8085', changeOrigin: true },
    }
  }
})
