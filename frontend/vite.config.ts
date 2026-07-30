import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'url'
import path from 'path'
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const localNodeModules = path.resolve(__dirname, 'node_modules')

// VITE_API_PROXY_TARGET permite que el frontend apunte al backend del entorno
// activo. El fallback local usa el backend real de NORTHMINE en 8001.
const apiProxyTarget = process.env.VITE_API_PROXY_TARGET ?? 'http://localhost:8001'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: [
      { find: '@', replacement: path.resolve(__dirname, 'src') },
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
        // Vite 8 (Rollup) quito el soporte del atajo de objeto para
        // manualChunks; misma agrupacion de antes, expresada como funcion.
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return
          if (/node_modules[\\/](react|react-dom)[\\/]/.test(id)) return 'vendor-react'
          if (/node_modules[\\/]recharts[\\/]/.test(id)) return 'vendor-charts'
          if (/node_modules[\\/](echarts|echarts-for-react)[\\/]/.test(id)) return 'vendor-echarts'
          if (/node_modules[\\/](three|@react-three)[\\/]/.test(id)) return 'vendor-three'
          if (/node_modules[\\/](zustand|@tanstack[\\/]react-query)[\\/]/.test(id)) return 'vendor-store'
          if (/node_modules[\\/]framer-motion[\\/]/.test(id)) return 'vendor-animation'
          if (/node_modules[\\/]lucide-react[\\/]/.test(id)) return 'vendor-icons'
        },
      },
    },
  },
})
