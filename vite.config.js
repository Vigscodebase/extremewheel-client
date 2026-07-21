import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
        // ADD THIS: Strips '/api' before sending to Express
        rewrite: (path) => path.replace(/^\/api/, '')
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    // Maintaining default 500kb limit by omitting chunkSizeWarningLimit
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            const modulePath = id.split('node_modules/')[1];
            const packageName = modulePath.split('/')[0];

            if (packageName.startsWith('@')) {
              const subPackageName = modulePath.split('/')[1];
              return `${packageName.replace('@', '')}-${subPackageName}`;
            }

            return packageName;
          }
        }
      }
    }
  }
});