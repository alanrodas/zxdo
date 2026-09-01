/// <reference types="vitest/config" />
import { builtinModules } from 'module';
import { resolve } from 'path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        bin: resolve(__dirname, 'src/bin.ts')
      },
      formats: ['es'],
      fileName: (_format, entryName) => `${entryName}.js`
    },
    rollupOptions: {
      external: ['zx', 'concurrently', 'fs-extra', ...builtinModules, ...builtinModules.map((m) => `${m}`)]
    },
    target: 'node18'
  },
  plugins: [
    dts({
      entryRoot: 'src',
      include: ['src']
    })
  ],
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/bin.ts'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80
      }
    }
  }
});
