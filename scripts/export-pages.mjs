import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile, mkdir, rm, cp } from 'node:fs/promises';
import { resolve, relative, join } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const source = join(root, 'source-lengkap');
const output = join(source, 'dist-preview');
const destination = join(root, 'docs');
const checking = process.argv.includes('--check');

async function files(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => {
    const file = join(directory, entry.name);
    return entry.isDirectory() ? files(file) : file;
  }));
  return nested.flat().sort();
}

const inputs = ['frontend-user', 'frontend-petugas', 'frontend-avalist', 'shared', 'public'];
const sourceFiles = (await Promise.all(inputs.map((name) => files(join(source, name))))).flat();
for (const name of ['index.html', 'anggota.html', 'petugas.html', 'avalist.html', 'vite.config.js', 'package.json', 'package-lock.json']) {
  sourceFiles.push(join(source, name));
}
const hash = createHash('sha256');
for (const file of sourceFiles.sort()) {
  hash.update(relative(source, file));
  hash.update('\0');
  hash.update(await readFile(file));
  hash.update('\0');
}
const metadata = JSON.stringify({ framework: 'Svelte', mode: 'static-preview', sourceHash: hash.digest('hex') }, null, 2) + '\n';
const built = await files(output);
if (!built.some((file) => relative(output, file) === 'avalist.html')) throw new Error('Build pratinjau belum lengkap.');
if (built.some((file) => /(?:^|\/)(?:server|backend)(?:\/|$)|spa-image2|membership-letter-source/.test(relative(output, file)))) {
  throw new Error('Berkas server/pribadi tidak boleh disalin ke Pages.');
}

if (checking) {
  const expected = new Set([...built.map((file) => relative(output, file)), 'CNAME', '.nojekyll', '_build.json']);
  const actual = await files(destination);
  if (actual.some((file) => !expected.has(relative(destination, file)))) throw new Error('docs/ masih memuat hasil build lama.');
  for (const file of built) {
    if (!(await readFile(file)).equals(await readFile(join(destination, relative(output, file))))) {
      throw new Error('docs/ tidak sesuai sumber: ' + relative(output, file));
    }
  }
  if ((await readFile(join(destination, '_build.json'), 'utf8')) !== metadata) throw new Error('Metadata sumber Pages tertinggal.');
  console.log('PASS: docs/ sama persis dengan build Svelte saat ini.');
} else {
  const cname = await readFile(join(destination, 'CNAME'), 'utf8');
  await rm(destination, { recursive: true, force: true });
  await mkdir(destination, { recursive: true });
  await cp(output, destination, { recursive: true });
  await writeFile(join(destination, 'CNAME'), cname.trim() + '\n');
  await writeFile(join(destination, '.nojekyll'), '');
  await writeFile(join(destination, '_build.json'), metadata);
  console.log('Pages diperbarui dari sumber Svelte yang sama; CNAME dipertahankan.');
}
