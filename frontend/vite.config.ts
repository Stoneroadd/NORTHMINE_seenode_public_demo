import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'url'
import path from 'path'
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const localNodeModules = path.resolve(__dirname, 'node_modules')

// VITE_API_PROXY_TARGET permite que el frontend apunte al backend del entorno
// activo. El fallback local usa el backend real de NORTHMINE en 8001.
const apiProxyTarget = process.env.VITE_API_PROXY_TARGET ?? 'http://localhost:8001'

export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: [
      { find: 'react-dom/client', replacement: `${localNodeModules}/react-dom/client.js` },
      { find: 'react/jsx-dev-runtime', replacement: `${localNodeModules}/react/jsx-dev-runtime.js` },
      { find: 'react/jsx-runtime', replacement: `${localNodeModules}/react/jsx-runtime.js` },
      { find: 'react-dom', replacement: `${localNodeModules}/react-dom/index.js` },
      { find: 'react', replacement: `${localNodeModules}/react/index.js` },
    ],
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-dom/client',
      'react/jsx-runtime',
      'react/jsx-dev-runtime',
      '@tanstack/react-query',
      'framer-motion',
      'lucide-react',
      'recharts',
      'echarts',
      'echarts-for-react',
    ],
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        target: apiProxyTarget,
        changeOrigin: true,
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 5000,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-charts': ['recharts'],
          'vendor-echarts': ['echarts', 'echarts-for-react'],
          'vendor-three': ['three', '@react-three/fiber', '@react-three/drei'],
          'vendor-store': ['zustand', '@tanstack/react-query'],
          'vendor-animation': ['framer-motion'],
          'vendor-icons': ['lucide-react'],
        },
      },
    },
  },
})
