import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8002', //'https://api.agencetntcargo.com' or 'http://localhost:8000' for local development
        changeOrigin: true,
      },
    },
  },
})