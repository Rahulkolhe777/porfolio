import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        // separate, long-cached vendor files that download in parallel
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('/three/')) return 'three';
          if (id.includes('/gsap/') || id.includes('/lenis/')) return 'motion';
          if (id.includes('/react') || id.includes('/scheduler/')) return 'react';
          return 'vendor';
        },
      },
    },
  },
});
