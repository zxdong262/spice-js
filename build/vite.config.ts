import { defineConfig } from 'vite';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, '../src/spice/index.ts'),
      name: 'SpiceClient',
      formats: ['es', 'cjs', 'iife'],
      fileName: (format) => {
        switch (format) {
          case 'es':
            return 'esm/index.js';
          case 'cjs':
            return 'cjs/index.js';
          case 'iife':
            return 'global/spice-client.min.js';
          default:
            return 'index.js';
        }
      },
    },
    outDir: resolve(__dirname, '../dist'),
    emptyDirBeforeWrite: true,
    minify: 'esbuild',
    sourcemap: true,
    rollupOptions: {
      external: [],
      output: {
        globals: {},
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, '../src'),
    },
  },
});
