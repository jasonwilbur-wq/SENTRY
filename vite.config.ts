import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  server: {
    port: 3000,
    host: '0.0.0.0',
    // Dev proxy: /api/* → FastAPI backend on :8082
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8082',
        changeOrigin: true,
      },
    },
  },

  plugins: [tailwindcss(), react()],

  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },

  build: {
    outDir: 'dist',
    sourcemap: false,
    // Split heavy vendor libs into separate chunks so Firebase CDN
    // can cache them independently of the app code.
    rollupOptions: {
      output: {
        manualChunks: {
          // React runtime
          'vendor-react':    ['react', 'react-dom'],
          // Charting libs (heavy — recharts pulls in d3)
          'vendor-charts':   ['recharts', 'd3'],
        },
      },
    },
    // Bump the warning threshold so the 206KB gzipped app doesn't warn
    chunkSizeWarningLimit: 600,
  },
});
