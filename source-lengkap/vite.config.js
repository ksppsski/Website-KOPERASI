import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [svelte()],
  publicDir: 'public',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        landing: resolve('index.html'),
        member: resolve('anggota.html'),
        staff: resolve('petugas.html'),
        avalist: resolve('avalist.html'),
      },
    },
  },
});
