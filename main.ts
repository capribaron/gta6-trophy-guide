// A working gta6-trophy-guide-01 entry (Node 22, standard library only): the guide is this directory's app/ folder,
// plain static files a browser opens at app/index.html (ES modules, CSS, no build step), offline: it loads nothing
// over the network, and its trophy list and guides are app/data/trophies.json. The program hands it in: it copies app/
// and screenshots/ from beside this file to /output and writes /output/dossier.json, the summary the judge reads (your
// screenshots, the first load's files and bytes, and your source), with the vendored make.fun library. Leave
// vendor/makefun-frontend.ts as it is: the scorer requires dossier.json to be byte for byte what its own copy writes.
//
// Only the plumbing, not a winner: a plain checklist of the 55 trophies with a one-line hint each. Write a real guide
// for every trophy in your own words, a roadmap to the platinum, filters and a spoiler setting in app/, put 3 or 4 PNG
// or JPEG screenshots of it in screenshots/ (the first by name is the cover; shots.json says which views this
// starter's were taken of), and run it.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Validate the trophy data before handing anything in: the guide is only
// worth entering if its data file parses, holds exactly the official 55
// trophies (1 platinum, 2 gold, 6 silver, 46 bronze), and every trophy has
// a non-blank guide in our own words plus at least one cited source. Fail
// loudly instead of submitting a broken or half-written guide.
const trophyDoc = JSON.parse(readFileSync(join(here, 'app', 'data', 'trophies.json'), 'utf-8'));
const trophyList = trophyDoc.trophies;
if (!Array.isArray(trophyList) || trophyList.length !== 55) {
  throw new Error(`trophies.json must hold exactly 55 trophies, found ${Array.isArray(trophyList) ? trophyList.length : 'no array'}`);
}
const gradeCounts = { platinum: 0, gold: 0, silver: 0, bronze: 0 };
const seenNames = new Set();
for (const t of trophyList) {
  if (typeof t.name !== 'string' || !t.name.trim()) throw new Error('a trophy has no name');
  if (seenNames.has(t.name)) throw new Error(`duplicate trophy name: ${t.name}`);
  seenNames.add(t.name);
  if (typeof t.description !== 'string' || !t.description.trim()) throw new Error(`trophy ${t.name} has no official description`);
  if (!(t.grade in gradeCounts)) throw new Error(`trophy ${t.name} has unknown grade ${t.grade}`);
  gradeCounts[t.grade] += 1;
  if (typeof t.guide !== 'string' || !t.guide.trim()) throw new Error(`trophy ${t.name} has no guide`);
  if (!Array.isArray(t.sources) || t.sources.length === 0) throw new Error(`trophy ${t.name} cites no source`);
}
if (gradeCounts.platinum !== 1 || gradeCounts.gold !== 2 || gradeCounts.silver !== 6 || gradeCounts.bronze !== 46) {
  throw new Error(`grade split must be 1/2/6/46, found ${JSON.stringify(gradeCounts)}`);
}
console.log(`trophies.json OK: 55 trophies (1 platinum, 2 gold, 6 silver, 46 bronze), every guide written and sourced.`);

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes; the others refuse an entry the
// scorer would refuse (more than 4 screenshots or one over 256 KiB; more than 993 files and directories in app/ or
// 48 MiB of app files: app/ counts beside /output's own 1000-entry cap, its screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, { text_max_bytes: 163840, screenshots: { max: 4, max_bytes: 262144 }, app_max_files: 993, app_max_bytes: 50331648 }),
);
