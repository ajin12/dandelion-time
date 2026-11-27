import { defineConfig } from 'vite';

export default defineConfig({
  server: { open: true },
  build: {
    // p5.js is a single large library (~1 MB min, ~250 KB gzipped); that's expected.
    chunkSizeWarningLimit: 1200,
  },
});
