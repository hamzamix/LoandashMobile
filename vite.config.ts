import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/dashboard-icons': {
        target: 'https://cdn.jsdelivr.net',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/dashboard-icons/, '/gh/walkxcode/dashboard-icons@master/svg'),
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
