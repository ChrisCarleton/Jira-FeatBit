import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [tailwindcss(), react()],
  server: {
    port: 3000,
    host: '127.0.0.1',
    // Forge tunnel proxies through a non-localhost host, which Vite 5 blocks by default.
    allowedHosts: true,
    hmr: {
      // The HMR WebSocket can't connect through the Forge tunnel — suppress the
      // connection-failure overlay so it doesn't block the page from rendering.
      overlay: false,
    },
  },
  build: {
    outDir: 'dist',
    // Forge Custom UI expects all assets relative to the index.html
    assetsDir: 'assets',
  },
  // Forge tunnel serves the app at a subpath, so all asset URLs must be relative.
  // Absolute paths ('/') would resolve against the tunnel host and 404.
  base: './',
});
