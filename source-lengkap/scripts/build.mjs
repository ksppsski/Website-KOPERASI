import { readFile, writeFile, readdir, mkdir, cp } from 'node:fs/promises';
import path from 'node:path';
import { build } from 'esbuild';

// Keep the established HTML/CSS/JS pages; the Worker adds the requested workflow API.
const assets = {};
const mime = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml'};
async function collect(directory, prefix='') {
  for (const entry of await readdir(directory,{withFileTypes:true})) {
    if (entry.name.startsWith('.') || entry.name==='server') continue;
    const relative = prefix+'/'+entry.name;
    if (entry.isDirectory()) await collect(path.join(directory,entry.name),relative);
    else if (mime[path.extname(entry.name)]) assets[relative]={type:mime[path.extname(entry.name)],body:(await readFile(path.join(directory,entry.name))).toString('base64')};
  }
}
await collect('dist');
await mkdir('dist/server',{recursive:true});
await mkdir('dist/.openai',{recursive:true});
const regular=(await readFile('templates/fonts/LiberationSans-Regular.ttf')).toString('base64');
const bold=(await readFile('templates/fonts/LiberationSans-Bold.ttf')).toString('base64');
const contractTemplate=(await readFile('templates/contract-original-layout.pdf')).toString('base64');
await build({entryPoints:['worker/index.js'],bundle:true,format:'esm',platform:'browser',target:'es2022',outfile:'dist/server/index.js',banner:{js:'const STATIC_ASSETS='+JSON.stringify(assets)+';const PDF_FONT_REGULAR='+JSON.stringify(regular)+';const PDF_FONT_BOLD='+JSON.stringify(bold)+';const PDF_CONTRACT_TEMPLATE='+JSON.stringify(contractTemplate)+';'},minify:true});
await cp('.openai/hosting.json','dist/.openai/hosting.json');
await cp('drizzle','dist/.openai/drizzle',{recursive:true});
console.log('Built KSPPS pages, workflow API, and database migrations.');
