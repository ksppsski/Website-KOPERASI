// Compatibility entry: run the real same-source Svelte preview tests.
process.chdir(new URL('../source-lengkap/', import.meta.url));
await import('../source-lengkap/tests/static-preview.mjs');
