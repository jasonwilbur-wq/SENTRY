import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  server: {
    port: 3000,
    strictPort: true,
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
    // Split heavy vendor libs so Firebase/CDN caches them independently.
    // Keep this as a function: object-form manualChunks can emit empty chunks
    // when dependencies are optimized or only referenced through subpaths.
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/scheduler/')) return 'vendor-react';
          if (id.includes('@react-three')) return 'vendor-r3f';
          if (id.includes('/three/')) return 'vendor-three';
          if (id.includes('/recharts/')) return 'vendor-recharts';
          if (id.includes('/d3') || id.includes('/internmap/') || id.includes('/delaunator/') || id.includes('/robust-predicates/')) return 'vendor-d3';
          if (id.includes('/framer-motion/')) return 'vendor-motion';
          return undefined;
        },
      },
    },
    // Three.js is inherently large, but it is lazy-route cached. Warn only when
    // chunks exceed the current known 3D vendor footprint.
    chunkSizeWarningLimit: 900,
  },
});
