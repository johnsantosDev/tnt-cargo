import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'https://api.agencetntcargo.com', //'https://api.agencetntcargo.com' or 'http://localhost:8000' for local development
        changeOrigin: true,
      },
    },
  },
})