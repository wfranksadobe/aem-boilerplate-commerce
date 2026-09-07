/* eslint-disable no-console */
// Recursively list two DA repos and diff SOURCE vs TARGET so we know exactly
// what is missing/extra in the target. The DA list API is per-folder
// (non-recursive), so walk folders with a work queue + 429 backoff.
//
// Usage: node tools/importer/da-diff.mjs [srcRepo] [tgtRepo]

import fs from 'node:fs';

const ORG = 'wfranksadobe';
const SRC = process.argv[2] || 'aem-boilerplate-commerce';
const TGT = process.argv[3] || 'uoa-figma';
const sleep = (ms) => new Promise((r) => { setTimeout(r, ms); });

async function listDir(repo, dirPath, attempt = 0) {
  const url = `https://admin.da.live/list/${ORG}/${repo}${dirPath}`;
  const res = await fetch(url);
  if (res.status === 429 && attempt < 6) { await sleep(1000 * (2 ** attempt)); return listDir(repo, dirPath, attempt + 1); }
  if (!res.ok) return { files: [], dirs: [] };
  const rows = await res.json();
  const files = []; const dirs = [];
  for (const r of rows) {
    const rel = r.path.replace(`/${ORG}/${repo}`, '');
    if (r.ext) files.push(rel); else dirs.push(rel);
  }
  return { files, dirs };
}

async function walk(repo) {
  const all = new Set();
  const queue = [''];
  let inFlight = 0;
  const CONC = 8;
  async function worker() {
    for (;;) {
      if (!queue.length) {
        if (inFlight === 0) return;
        await sleep(40);
        // eslint-disable-next-line no-continue
        continue;
      }
      const dir = queue.shift();
      inFlight += 1;
      try {
        const { files, dirs } = await listDir(repo, dir);
        files.forEach((f) => all.add(f));
        dirs.forEach((d) => queue.push(d));
      } finally {
        inFlight -= 1;
      }
      await sleep(15);
    }
  }
  await Promise.all(Array.from({ length: CONC }, () => worker()));
  return all;
}

console.error('Walking SOURCE', SRC, '…');
const src = await walk(SRC);
console.error(`  source files: ${src.size}`);
console.error('Walking TARGET', TGT, '…');
const tgt = await walk(TGT);
console.error(`  target files: ${tgt.size}`);

const missing = [...src].filter((f) => !tgt.has(f)).sort();
const extra = [...tgt].filter((f) => !src.has(f)).sort();

fs.writeFileSync('tools/importer/.progress/da-missing.txt', missing.join('\n') + (missing.length ? '\n' : ''));
fs.writeFileSync('tools/importer/.progress/da-extra.txt', extra.join('\n') + (extra.length ? '\n' : ''));

console.log(JSON.stringify({
  sourceCount: src.size,
  targetCount: tgt.size,
  missingCount: missing.length,
  extraCount: extra.length,
  missingSample: missing.slice(0, 15),
  extraSample: extra.slice(0, 15),
}, null, 1));
console.error('Full lists: tools/importer/.progress/da-{missing,extra}.txt');
