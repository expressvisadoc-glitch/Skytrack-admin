import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const PRODUCTION_SKYTRACK_API = 'https://cwtrrtbodqctntkpnjlv.supabase.co/functions/v1/skytrack-api'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // SKYTRACK_PROXY_TARGET (e.g. in .env.staging.local) points the local /api/skytrack proxy at a
  // staging project. Without it the proxy targets production, exactly as before.
  const env = loadEnv(mode, process.cwd(), '')
  const proxyTarget = env.SKYTRACK_PROXY_TARGET || PRODUCTION_SKYTRACK_API
  const skytrackProxy = {
    '/api/skytrack': {
      target: proxyTarget,
      changeOrigin: true,
      rewrite: (path: string) => path.replace(/^\/api\/skytrack/, ''),
    },
  }

  return {
    plugins: [
      react(),
      tailwindcss(),
    ],
    server: {
      proxy: skytrackProxy,
    },
    preview: {
      proxy: skytrackProxy,
    },
  }
})
