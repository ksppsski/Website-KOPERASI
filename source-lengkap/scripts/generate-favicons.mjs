import { readFile, writeFile } from 'node:fs/promises';

// A small native vector symbol is the source of every favicon variant.
// It follows the original brand contours; no full logo or Base64 image is embedded.
const publicDirectory = new URL('../public/', import.meta.url);
const symbol = await readFile(new URL('assets/kspps-symbol.svg', publicDirectory), 'utf8');
const paths = symbol.match(/<path\b[\s\S]*?\/>/g).join('\n  ');

function favicon(theme) {
  const styles =
    theme === 'dark'
      ? 'path { fill: #fff; }'
      : theme === 'adaptive'
        ? '@media (prefers-color-scheme: dark) { path { fill: #fff; } }'
        : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-66 -8.5 272 272" width="64" height="64">
  <title>KSPPS Syirkah Kebaikan Indonesia</title>
${styles ? '  <style>' + styles + '</style>\n' : ''}  ${paths}
</svg>
`;
}
for (const [name, theme] of [
  ['favicon.svg', 'adaptive'],
  ['favicon-light.svg', 'light'],
  ['favicon-dark.svg', 'dark'],
]) {
  await writeFile(new URL(name, publicDirectory), favicon(theme));
}
console.log('Generated compact KSPPS favicons: adaptive, light, and dark.');
