import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8002', //'https://api.agencetntcargo.com' or 'http://localhost:8002' for local development
        changeOrigin: true,
      },
    },
  },
})