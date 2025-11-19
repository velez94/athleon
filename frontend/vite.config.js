import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
    plugins: [react()],
    server: {
      port: 3000,
      open: true
    },
    build: {
      outDir: 'build',
      sourcemap: true
    },
    // Make REACT_APP_ variables available as VITE_ for compatibility
    define: {
      'import.meta.env.VITE_API_URL': JSON.stringify(env.REACT_APP_API_URL || env.VITE_API_URL),
      'import.meta.env.VITE_USER_POOL_ID': JSON.stringify(env.REACT_APP_USER_POOL_ID || env.VITE_USER_POOL_ID),
      'import.meta.env.VITE_USER_POOL_CLIENT_ID': JSON.stringify(env.REACT_APP_USER_POOL_CLIENT_ID || env.VITE_USER_POOL_CLIENT_ID),
      'import.meta.env.VITE_REGION': JSON.stringify(env.REACT_APP_REGION || env.VITE_REGION),
      'import.meta.env.VITE_ENV': JSON.stringify(env.REACT_APP_ENV || env.VITE_ENV),
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/setupTests.js'],
      css: true,
    }
  }
})
