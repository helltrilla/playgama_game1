// Packs dist/ into game.zip (index.html at the archive root, Latin names only).
import fs from 'node:fs';
import path from 'node:path';
import { zipSync } from 'fflate';

const root = path.resolve('dist');
const files = {};
let bad = [];
function walk(dir, prefix) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const rel = prefix ? `${prefix}/${name}` : name;
    if (!/^[A-Za-z0-9._\-\/]+$/.test(rel)) bad.push(rel);
    if (fs.statSync(full).isDirectory()) walk(full, rel);
    else files[rel] = new Uint8Array(fs.readFileSync(full));
  }
}
walk(root, '');
if (bad.length) {
  console.error('Non-Latin file names:', bad);
  process.exit(1);
}
if (!files['index.html'] || !files['playgama-bridge-config.json']) {
  console.error('index.html / playgama-bridge-config.json missing in dist root');
  process.exit(1);
}
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const versionedName = `game-v${pkg.version}.zip`;
const zipped = zipSync(files, { level: 9 });
fs.writeFileSync('game.zip', zipped);
fs.writeFileSync(versionedName, zipped);
const raw = Object.values(files).reduce((s, f) => s + f.length, 0);
console.log(`${versionedName} (and game.zip): ${(zipped.length / 1048576).toFixed(2)} MB (${Object.keys(files).length} files, dist ${(raw / 1048576).toFixed(2)} MB)`);
