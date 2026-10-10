import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    proxy: {
      '/api/skytrack': {
        target: 'https://cwtrrtbodqctntkpnjlv.supabase.co/functions/v1/skytrack-api',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/skytrack/, ''),
      },
    },
  },
  preview: {
    proxy: {
      '/api/skytrack': {
        target: 'https://cwtrrtbodqctntkpnjlv.supabase.co/functions/v1/skytrack-api',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/skytrack/, ''),
      },
    },
  },
})
