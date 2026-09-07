/* eslint-disable no-console */
// Copy the missing news content from SOURCE DA repo to TARGET DA repo using the
// DA cross-repo copy API (POST /copy/{org}/{repo}/{path} with a destination in
// another repo). Copies at the DAY-FOLDER level (recursive), which is far
// cheaper than per-file, plus a small set of news-root files. Resumable.
//
// Usage: node tools/importer/da-copy-news.mjs [--concurrency=N] [--reset]

import fs from 'node:fs';
import { spawn } from 'node:child_process';

const ORG = 'wfranksadobe';
const SRC = 'aem-boilerplate-commerce';
const TGT = 'uoa-figma';
const PROG = 'tools/importer/.progress';
const DONE = `${PROG}/da-copy-done.txt`;
const FAIL = `${PROG}/da-copy-failed.tsv`;

const args = process.argv.slice(2);
const concurrency = Number((args.find((a) => a.startsWith('--concurrency=')) || '').split('=')[1] || 4);
const reset = args.includes('--reset');
const sleep = (ms) => new Promise((r) => { setTimeout(r, ms); });

// Day folders (recursive copies) + explicit news-root files.
const dayFolders = fs.readFileSync(`${PROG}/da-day-folders.txt`, 'utf8')
  .split('\n').map((s) => s.trim()).filter(Boolean);
const rootFiles = fs.readFileSync(`${PROG}/da-missing.txt`, 'utf8')
  .split('\n').map((s) => s.trim()).filter(Boolean)
  .filter((p) => /^\/nz\/en\/news\/[^/]+$/.test(p)); // e.g. /nz/en/news/index.html, hero.jpg

const work = [...dayFolders, ...rootFiles];

if (reset && fs.existsSync(DONE)) fs.rmSync(DONE);
const done = new Set(fs.existsSync(DONE) ? fs.readFileSync(DONE, 'utf8').split('\n').filter(Boolean) : []);

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
const ok = (c) => /^20\d$/.test(c); // 200/201/204

async function copyOne(p) {
  const code = await retry(['-X', 'POST', '-F', `destination=/${ORG}/${TGT}${p}`,
    `https://admin.da.live/copy/${ORG}/${SRC}${p}`]);
  if (!ok(code)) throw new Error(`copy ${code}`);
}

const total = work.length;
let okc = 0; let fail = 0; let skip = 0; let processed = 0;
const t0 = Date.now();
let i = 0;
const worker = async () => {
  for (;;) {
    const idx = i; i += 1;
    if (idx >= work.length) return;
    const p = work[idx];
    if (done.has(p)) { skip += 1; processed += 1; continue; }
    try { await copyOne(p); okc += 1; done.add(p); fs.appendFileSync(DONE, `${p}\n`); } catch (e) { fail += 1; fs.appendFileSync(FAIL, `${p}\t${e.message}\n`); }
    processed += 1;
    await sleep(60);
    if (processed % 25 === 0 || processed === total) {
      const secs = ((Date.now() - t0) / 1000).toFixed(0);
      console.error(`[${processed}/${total}] ok=${okc} fail=${fail} skip=${skip} (${secs}s)`);
    }
  }
};
await Promise.all(Array.from({ length: concurrency }, () => worker()));
console.log(`DONE. ok=${okc} failed=${fail} skipped=${skip} of ${total}`);
if (fail) console.log(`Failures: ${FAIL}`);
