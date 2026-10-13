import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { build } from 'esbuild';
import { compile } from 'svelte/compiler';
import { JSDOM } from 'jsdom';

const bundles = new Map();
export async function browser(entry, { fetch, compare, hash = 'masuk' } = {}) {
  if (!bundles.has(entry)) {
    const result = await build({
      entryPoints: [
        (entry === 'avalist'
          ? 'frontend-avalist'
          : entry === 'petugas'
            ? 'frontend-petugas'
            : 'frontend-user') +
          '/src/entries/' +
          entry +
          '.js',
      ],
      metafile: true,
      bundle: true,
      write: false,
      format: 'iife',
      platform: 'browser',
      conditions: ['browser'],
      define: { 'process.env.NODE_ENV': '"production"' },
      plugins: [
        {
          name: 'svelte-browser-test',
          setup(build) {
            build.onLoad({ filter: /\.svelte$/ }, ({ path }) => ({
              contents: compile(readFileSync(path, 'utf8'), {
                filename: path,
                generate: 'client',
                dev: false,
              }).js.code,
              loader: 'js',
            }));
            build.onLoad({ filter: /\.css$/ }, () => ({ contents: '', loader: 'js' }));
            build.onLoad(
              { filter: /frontend-petugas\/src\/features\/staff\/controller\.js$/ },
              ({ path }) => ({
                contents: readFileSync(path, 'utf8').replaceAll(
                  "location.replace('/avalist.html#' + route)",
                  "window.__navigate('/avalist.html#' + route)",
                ),
                loader: 'js',
              }),
            );
            build.onLoad({ filter: /shared\/create-portal\.js$/ }, ({ path }) => ({
              contents:
                "import { workflowService as test_workflowService } from './services/workflow.js';\nObject.defineProperty(window, 'KsppsWorkflow', { get: () => test_workflowService });\nimport { activityService as test_activityService } from './services/activity.js';\nObject.defineProperty(window, 'KsppsActivity', { get: () => test_activityService });\nimport { financeService as test_financeService } from './services/finance.js';\nObject.defineProperty(window, 'KsppsFinance', { get: () => test_financeService });\nimport { maturityService as test_maturityService } from './services/maturity.js';\nObject.defineProperty(window, 'KsppsMaturity', { get: () => test_maturityService });\nimport { withdrawalService as test_withdrawalService } from './services/withdrawal.js';\nObject.defineProperty(window, 'KsppsWithdrawal', { get: () => test_withdrawalService });\nimport { reportsService as test_reportsService } from './services/reports.js';\nObject.defineProperty(window, 'KsppsReports', { get: () => test_reportsService });\nimport { staffAccessService as test_staffAccessService } from './services/staff-access.js';\nObject.defineProperty(window, 'KsppsStaffAccess', { get: () => test_staffAccessService });\n" +
                readFileSync(path, 'utf8').replace(
                  'return (model) => flushSync(() => view.set(model));',
                  `return (model) => { const expected = model.html?.(); flushSync(() => view.set(model)); window.__view = model; window.__compare?.(model, expected, document.querySelector('#app')); };`,
                ),
              loader: 'js',
            }));
          },
        },
      ],
    });
    // Each frontend must compile independently of the other frontend and server.
    const forbidden =
      entry === 'petugas'
        ? ['frontend-user/', 'frontend-avalist/']
        : entry === 'avalist'
          ? ['frontend-user/', 'frontend-petugas/']
          : ['frontend-petugas/', 'frontend-avalist/'];
    for (const input of Object.keys(result.metafile.inputs)) {
      assert(
        !forbidden.some((prefix) => input.startsWith(prefix)),
        entry + ' imports the other frontend: ' + input,
      );
      assert(!input.startsWith('backend/'), 'Server code entered the browser bundle: ' + input);
    }
    bundles.set(entry, result.outputFiles[0].text);
  }
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
    url: 'https://kspps.example/' + entry + '.html#' + hash,
    runScripts: 'outside-only',
    pretendToBeVisual: true,
  });
  const { window } = dom;
  const errors = [];
  window.addEventListener('error', (event) => errors.push(event.error || new Error(event.message)));
  const RealDate = window.Date;
  window.Date = class extends RealDate {
    constructor(...args) {
      super(...(args.length ? args : ['2026-09-25T08:00:00Z']));
    }
    static now() {
      return new RealDate('2026-09-25T08:00:00Z').valueOf();
    }
  };
  window.scrollTo = () => {};
  window.HTMLElement.prototype.scrollIntoView = () => {};
  window.HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  window.HTMLDialogElement.prototype.close = function () {
    this.open = false;
    this.dispatchEvent(new window.Event('close'));
  };
  window.URL.createObjectURL = () => 'blob:attachment-preview';
  window.URL.revokeObjectURL = () => {};
  window.HTMLCanvasElement.prototype.getContext = () => ({
    beginPath() {},
    moveTo() {},
    lineTo() {},
    stroke() {},
    drawImage() {},
    clearRect() {},
  });
  window.fetch =
    fetch ||
    (async () => ({
      ok: false,
      status: 401,
      json: async () => ({ error: 'Masuk dengan ChatGPT', signInRequired: true }),
    }));
  window.__compare = compare;
  window.__navigations = [];
  window.__navigate = (path) => window.__navigations.push(path);
  window.eval(bundles.get(entry));
  const settle = async () => {
    await new Promise((resolve) => setTimeout(resolve, 15));
    if (errors.length) throw errors[0];
  };
  await settle();
  return {
    window,
    document: window.document,
    errors,
    settle,
    async route(name) {
      window.location.hash = name;
      await settle();
    },
    async click(selector) {
      const node = window.document.querySelector(selector);
      if (!node) throw new Error('Missing element: ' + selector);
      node.click();
      await settle();
    },
    close() {
      window.close();
    },
  };
}

export function normalize(node) {
  if (typeof node === 'string') {
    const doc = new JSDOM('<div id="fixture">' + node + '</div>').window.document;
    return normalize(doc.getElementById('fixture'))[2];
  }
  if (node.nodeType === 3) return node.textContent.replace(/\s+/g, ' ').trim();
  if (node.nodeType !== 1) return null;
  const attrs = [...node.attributes]
    .filter((a) => !a.name.startsWith('data-svelte') && !(a.name === 'class' && !a.value.trim()))
    .map((a) => [
      a.name,
      a.name === 'class' ? a.value.trim().split(/\s+/).sort().join(' ') : a.value,
    ]);
  // Svelte sets input values as properties, whereas the previous renderer used attributes.
  if (node.tagName === 'INPUT') {
    const index = attrs.findIndex((a) => a[0] === 'value');
    if (index >= 0) attrs.splice(index, 1);
    attrs.push(['value', node.value]);
  }
  attrs.sort(([a], [b]) => a.localeCompare(b));
  const nodes = [];
  for (const child of node.childNodes) {
    if (child.nodeType === 8) continue;
    if (child.nodeType === 3 && nodes.at(-1)?.nodeType === 3)
      nodes[nodes.length - 1] = {
        nodeType: 3,
        textContent: nodes.at(-1).textContent + child.textContent,
      };
    else nodes.push(child);
  }
  return [
    node.tagName.toLowerCase(),
    attrs,
    nodes.map(normalize).filter((x) => x !== null && x !== ''),
  ];
}
