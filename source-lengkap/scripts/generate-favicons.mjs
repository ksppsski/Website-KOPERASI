import { readFile, writeFile } from 'node:fs/promises';

// SVG favicons cannot rely on external images. Embed the existing brand assets,
// and crop only the symbol using an SVG viewport so the source logos stay intact.
const publicDirectory = new URL('../public/', import.meta.url);
const logoFiles = {
  light: { name: 'kspps-logo-color-web.png', height: 255 },
  dark: { name: 'kspps-logo-white-web.png', height: 256 },
};

async function logoMarkup(theme) {
  const { name, height } = logoFiles[theme];
  const image = await readFile(new URL(`assets/${name}`, publicDirectory));
  const width = (140 / height) * 60;
  const left = (64 - width) / 2;

  return `  <svg class="logo-${theme}" x="${left.toFixed(2)}" y="2"
    width="${width.toFixed(2)}" height="60" viewBox="0 0 140 ${height}" overflow="hidden">
    <image width="720" height="${height}"
      xlink:href="data:image/png;base64,${image.toString('base64')}" />
  </svg>`;
}

function favicon(body) {
  return `<svg xmlns="http://www.w3.org/2000/svg"
  xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 64 64" width="64" height="64">
  <title>KSPPS Syirkah Kebaikan Indonesia</title>
${body}
</svg>
`;
}

const light = await logoMarkup('light');
const dark = await logoMarkup('dark');
const adaptiveStyles = `  <style>
    .logo-dark { display: none; }
    @media (prefers-color-scheme: dark) {
      .logo-light { display: none; }
      .logo-dark { display: inline; }
    }
  </style>`;

await writeFile(
  new URL('favicon.svg', publicDirectory),
  favicon(`${adaptiveStyles}\n${light}\n${dark}`),
);
await writeFile(new URL('favicon-light.svg', publicDirectory), favicon(light));
await writeFile(new URL('favicon-dark.svg', publicDirectory), favicon(dark));
console.log('Generated transparent KSPPS favicons: adaptive, light, and dark.');
