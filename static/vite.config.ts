import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [tailwindcss(), react()],
  build: {
    outDir: 'dist',
    // Forge Custom UI expects all assets relative to the index.html
    assetsDir: 'assets',
  },
  // Important: assets must use relative paths so Forge can serve them
  base: './',
});
