/* eslint-disable no-console */
// Make migrated news article images display in the DA editor.
//
// The DA editor canvas loads at da.live/edit#/…, so a RELATIVE image src
// ("./slug-image-N.jpg") resolves against da.live — not content.da.live where
// the binary lives — and shows broken. The DA-native form is a FULL delivery
// URL: https://content.da.live/{org}/{repo}/{path}. That form displays in the
// editor AND the EDS media pipeline still ingests it on publish (verified).
//
// Per article: read the current DA source, rewrite every relative "./…" image
// src to the absolute content.da.live URL rooted at the article's own folder,
// re-upload, then preview + publish. Resumable.
//
// Usage: node tools/importer/fix-da-editor-images.mjs
//   [--concurrency=N] [--limit=N] [--offset=N] [--only=YYYY/MM/DD/slug] [--reset]

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../..');
const ORG = 'wfranksadobe';
const SITE = 'aem-boilerplate-commerce';
const CONTENT = path.join(REPO_ROOT, 'content/nz/en/news');
const PROG = path.join(__dirname, '.progress');
const DONE = path.join(PROG, 'fix-editor-img-done.txt');
const FAIL = path.join(PROG, 'fix-editor-img-failed.tsv');
const BASE = `https://content.da.live/${ORG}/${SITE}/nz/en/news`;

const args = process.argv.slice(2);
const concurrency = Number((args.find((a) => a.startsWith('--concurrency=')) || '').split('=')[1] || 4);
const limit = Number((args.find((a) => a.startsWith('--limit=')) || '').split('=')[1] || 0);
const offset = Number((args.find((a) => a.startsWith('--offset=')) || '').split('=')[1] || 0);
const only = (args.find((a) => a.startsWith('--only=')) || '').split('=')[1] || '';
const reset = args.includes('--reset');
const sleep = (ms) => new Promise((r) => { setTimeout(r, ms); });

// Article list from local .plain.html (mirrors DA layout).
const rels = [];
const walk = (d) => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const fp = path.join(d, e.name);
    if (e.isDirectory()) walk(fp);
    else if (e.name.endsWith('.plain.html')) rels.push(path.relative(CONTENT, fp).replace(/\.plain\.html$/, ''));
  }
};
['2024', '2025', '2026'].forEach((y) => fs.existsSync(path.join(CONTENT, y)) && walk(path.join(CONTENT, y)));
rels.sort();
let work = rels;
if (only) work = work.filter((r) => r === only);
if (offset) work = work.slice(offset);
if (limit) work = work.slice(0, limit);

fs.mkdirSync(PROG, { recursive: true });
if (reset && fs.existsSync(DONE)) fs.rmSync(DONE);
const done = new Set(fs.existsSync(DONE) ? fs.readFileSync(DONE, 'utf8').split('\n').filter(Boolean) : []);

function curlOut(cargs) {
  return new Promise((resolve) => {
    const c = spawn('curl', ['-s', ...cargs]);
    let out = ''; c.stdout.on('data', (d) => { out += d; });
    c.on('close', () => resolve(out)); c.on('error', () => resolve(''));
  });
}
function curlCode(cargs) {
  return new Promise((resolve) => {
    const c = spawn('curl', ['-s', '-o', '/dev/null', '-w', '%{http_code}', ...cargs]);
    let out = ''; c.stdout.on('data', (d) => { out += d; });
    c.on('close', () => resolve(out.trim())); c.on('error', () => resolve('000'));
  });
}
async function retry(cargs, attempt = 0) {
  const code = await curlCode(cargs);
  if (code === '429' && attempt < 6) { await sleep(1000 * (2 ** attempt)); return retry(cargs, attempt + 1); }
  return code;
}
const ok2 = (c) => /^20\d$/.test(c);

const total = work.length;
let ok = 0; let fail = 0; let skip = 0; let noop = 0; let processed = 0;
const t0 = Date.now();

async function handle(rel) {
  const dir = path.dirname(rel); // YYYY/MM/DD
  const remote = `nz/en/news/${rel}`;
  const html = await curlOut([`https://admin.da.live/source/${ORG}/${SITE}/${remote}.html`]);
  if (!html || !html.includes('<img')) throw new Error('no source/img');

  // Only rewrite relative image refs; leave already-absolute URLs alone.
  const re = /(<img[^>]*\bsrc=")\.\/([^"]+")/g;
  if (!re.test(html)) { noop += 1; return; }
  const out = html.replace(re, (_m, pre, rest) => `${pre}${BASE}/${dir}/${rest}`);

  const tmp = path.join(os.tmpdir(), `edimg-${rel.replace(/\W/g, '_')}.html`);
  // Preserve the body/main wrapper the DA docs use.
  const wrapped = /<body>/i.test(out) ? out : `<body>\n<main>\n${out}\n</main>\n</body>\n`;
  fs.writeFileSync(tmp, wrapped);
  try {
    const up = await retry(['-X', 'POST', '-F', `data=@${tmp};type=text/html`,
      `https://admin.da.live/source/${ORG}/${SITE}/${remote}.html`]);
    if (!ok2(up)) throw new Error(`upload ${up}`);
  } finally { fs.rmSync(tmp, { force: true }); }
  const pv = await retry(['-X', 'POST', `https://admin.hlx.page/preview/${ORG}/${SITE}/main/${remote}`]);
  if (!ok2(pv)) throw new Error(`preview ${pv}`);
  const li = await retry(['-X', 'POST', `https://admin.hlx.page/live/${ORG}/${SITE}/main/${remote}`]);
  if (!ok2(li)) throw new Error(`publish ${li}`);
}

let i = 0;
const worker = async () => {
  for (;;) {
    const idx = i; i += 1;
    if (idx >= work.length) return;
    const rel = work[idx];
    if (done.has(rel)) { skip += 1; processed += 1; continue; }
    try { await handle(rel); ok += 1; done.add(rel); fs.appendFileSync(DONE, `${rel}\n`); } catch (e) { fail += 1; fs.appendFileSync(FAIL, `${rel}\t${e.message}\n`); }
    processed += 1;
    await sleep(40);
    if (processed % 50 === 0 || processed === total) {
      const secs = ((Date.now() - t0) / 1000).toFixed(0);
      console.error(`[${processed}/${total}] ok=${ok} fail=${fail} skip=${skip} noop=${noop} (${secs}s)`);
    }
  }
};
await Promise.all(Array.from({ length: concurrency }, () => worker()));
console.log(`DONE. ok=${ok} failed=${fail} skipped=${skip} noop=${noop} of ${total}`);
if (fail) console.log(`Failures: ${path.relative(REPO_ROOT, FAIL)}`);
