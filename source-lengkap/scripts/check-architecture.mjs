import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import ts from 'typescript';

// Keep feature boundaries visible and prevent circular imports from returning.
const roots = ['frontend-user', 'frontend-petugas', 'frontend-avalist', 'shared', 'backend/src'];
const graph = new Map();

async function sourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((entry) => {
      const filename = path.join(directory, entry.name);
      return entry.isDirectory() ? sourceFiles(filename) : filename;
    }),
  );
  return files.flat().filter((filename) => /\.(js|ts|svelte)$/.test(filename));
}

for (const filename of (await Promise.all(roots.map(sourceFiles))).flat()) {
  const source = await readFile(filename, 'utf8');
  for (const [index, line] of source.split('\n').entries()) {
    assert(
      line.length <= 180,
      `${filename}:${index + 1}: pecah baris ${line.length} karakter menjadi bagian yang terbaca.`,
    );
  }
  const frontend = !filename.startsWith('backend/');
  if (frontend) {
    assert(
      !/window\s*(?:\.\s*Kspps|\[\s*['"]Kspps)/.test(source),
      `${filename}: gunakan import layanan yang eksplisit, bukan window.Kspps.`,
    );
  }
  if (frontend) {
    assert(!source.includes('{@html'), `${filename}: gunakan komponen Svelte untuk markup.`);
    assert(!/\.innerHTML\s*=/.test(source), `${filename}: Svelte harus memiliki DOM-nya sendiri.`);
    assert(
      !/export\s+let\s+\w*Service/.test(source),
      `${filename}: layanan harus dimiliki instance portal.`,
    );
    assert(
      !/window\.dispatchEvent\(new CustomEvent\(['"]kspps-/.test(source),
      `${filename}: event fitur harus dibatasi ke instance portal.`,
    );
  }
  const scripts = filename.endsWith('.svelte')
    ? [...source.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)]
        .map((match) => match[1])
        .join('\n')
    : source;
  const ast = ts.createSourceFile(
    filename + '.js',
    scripts,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.JS,
  );
  const dependencies = [];
  for (const statement of ast.statements) {
    if (!ts.isImportDeclaration(statement) && !ts.isExportDeclaration(statement)) continue;
    const specifier = statement.moduleSpecifier?.text;
    if (!specifier?.startsWith('.')) continue;
    const target = path.normalize(path.join(path.dirname(filename), specifier));
    if (/\.(js|ts|svelte)$/.test(target)) dependencies.push(target);
    const frontendOwner = roots.slice(0, 3).find((prefix) => filename.startsWith(prefix + '/'));
    if (frontendOwner) {
      assert(
        !target.startsWith('backend/'),
        `${filename}: backend tidak boleh masuk bundle browser.`,
      );
      for (const other of roots.slice(0, 3).filter((prefix) => prefix !== frontendOwner)) {
        assert(
          !target.startsWith(other + '/'),
          `${filename}: tidak boleh mengimpor portal lain (${target}).`,
        );
      }
    }
    if (filename.startsWith('shared/')) {
      assert(
        target.startsWith('shared/'),
        `${filename}: shared harus independen dari implementasi portal/server.`,
      );
    }
    if (filename.startsWith('backend/')) {
      assert(
        !roots.slice(0, 3).some((prefix) => target.startsWith(prefix + '/')),
        `${filename}: backend tidak boleh mengimpor UI portal.`,
      );
    }
  }
  graph.set(filename, dependencies);
}

const complete = new Set();
function visit(filename, stack = []) {
  assert(!stack.includes(filename), `Import melingkar: ${[...stack, filename].join(' → ')}`);
  if (complete.has(filename)) return;
  for (const dependency of graph.get(filename) || []) visit(dependency, [...stack, filename]);
  complete.add(filename);
}
for (const filename of graph.keys()) visit(filename);
console.log(
  `PASS: ${graph.size} source modules have explicit imports, no circular dependencies, and independent portal bundles.`,
);
