import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { resolve } from 'node:path';

function stableStylesheetOrder() {
  return {
    name: 'kspps-stable-stylesheet-order',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html, { bundle, chunk }) {
        if (!bundle || !chunk) return html;

        // Walk each page independently so shared-chunk caches cannot change the cascade.
        const visited = new Set();
        const styles = new Map();
        function visit(current) {
          if (current?.type !== 'chunk' || visited.has(current.fileName)) return;
          visited.add(current.fileName);
          for (const name of current.imports) visit(bundle[name]);
          for (const name of current.viteMetadata?.importedCss || []) {
            if (!styles.has(name)) styles.set(name, styles.size);
          }
        }
        visit(chunk);

        const stylesheetLinks = /<link\b[^>]*\brel=["']stylesheet["'][^>]*>/gi;
        function rank(tag) {
          const href = tag.match(/\bhref=(["'])(.*?)\1/i)?.[2];
          return styles.get(href?.replace(/^\.?\//, ''));
        }
        const links = [...html.matchAll(stylesheetLinks)]
          .map(([tag]) => ({ tag, rank: rank(tag) }))
          .filter((link) => link.rank !== undefined)
          .sort((left, right) => left.rank - right.rank);
        let index = 0;
        // Replace only existing build links; keep external fonts and every asset intact.
        return html.replace(stylesheetLinks, (tag) =>
          rank(tag) === undefined ? tag : links[index++].tag,
        );
      },
    },
  };
}

export default defineConfig(({ mode }) => ({
  base: mode === 'static-preview' ? './' : '/',
  define: { __KSPPS_STATIC_PREVIEW__: JSON.stringify(mode === 'static-preview') },
  plugins: [svelte(), stableStylesheetOrder()],
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
}));
