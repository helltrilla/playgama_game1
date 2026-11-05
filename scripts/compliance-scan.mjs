// Compliance scanner verifying Playgama requirements on the project and built artifacts.
import fs from 'node:fs';
import path from 'node:path';

let failed = false;
function check(name, pass, msg) {
  if (pass) {
    console.log(`  ✓ ${name}`);
  } else {
    console.error(`  ✗ ${name}: ${msg}`);
    failed = true;
  }
}

console.log('Running Playgama Compliance Scan...');

// 1. Check index.html (or dist/index.html if scanning dist)
const targetDir = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve('public');
const indexHtmlPath = fs.existsSync(path.resolve('dist/index.html'))
  ? path.resolve('dist/index.html')
  : path.resolve('index.html');

if (fs.existsSync(indexHtmlPath)) {
  const html = fs.readFileSync(indexHtmlPath, 'utf8');
  const headMatch = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
  if (headMatch) {
    const head = headMatch[1];
    const scriptIndex = head.indexOf('<script');
    const bridgeIndex = head.indexOf('https://bridge.playgama.com/v2/stable/playgama-bridge.js');
    check(
      'Bridge script in <head>',
      bridgeIndex !== -1,
      'Playgama Bridge script not found in <head>'
    );
    check(
      'Bridge is the first script',
      scriptIndex !== -1 && head.slice(scriptIndex, scriptIndex + 120).includes('playgama-bridge.js'),
      'Bridge script must be the very first script in <head>'
    );
    const bridgeTagMatch = head.match(/<script[^>]*playgama-bridge\.js[^>]*>/i);
    if (bridgeTagMatch) {
      const tag = bridgeTagMatch[0];
      check(
        'Bridge script has no async/defer',
        !tag.includes('async') && !tag.includes('defer'),
        'Bridge script must NOT have async or defer'
      );
    }
  }
}

// 2. Check playgama-bridge-config.json
const configPath = fs.existsSync(path.resolve('dist/playgama-bridge-config.json'))
  ? path.resolve('dist/playgama-bridge-config.json')
  : path.resolve('public/playgama-bridge-config.json');

if (fs.existsSync(configPath)) {
  try {
    const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    check(
      'playgama-bridge-config.json is valid JSON',
      typeof cfg === 'object' && cfg !== null,
      'Invalid config JSON'
    );
    check(
      'Config has platforms object',
      typeof cfg.platforms === 'object',
      'Config missing "platforms"'
    );
    check(
      'Config has advertisement object',
      typeof cfg.advertisement === 'object',
      'Config missing "advertisement"'
    );
  } catch (e) {
    check('playgama-bridge-config.json is valid', false, String(e));
  }
} else {
  check('playgama-bridge-config.json exists', false, 'File not found');
}

// 3. Scan dist/ for forbidden APIs, external URLs, Escape keys, etc.
const distDir = path.resolve('dist');
if (fs.existsSync(distDir)) {
  let hasLocalStorage = false;
  let hasSessionStorage = false;
  let hasIndexedDB = false;
  let hasDocumentCookie = false;
  let hasExternalUrls = [];
  let hasEscapeKey = false;

  function scanDir(dir) {
    for (const name of fs.readdirSync(dir)) {
      const p = path.join(dir, name);
      if (fs.statSync(p).isDirectory()) {
        scanDir(p);
      } else if (name.endsWith('.js') || name.endsWith('.html')) {
        const content = fs.readFileSync(p, 'utf8');
        // Match actual usages, not benign substrings
        if (/\b(?:window\.)?localStorage\b/.test(content)) hasLocalStorage = true;
        if (/\b(?:window\.)?sessionStorage\b/.test(content)) hasSessionStorage = true;
        if (/\b(?:window\.)?indexedDB\b/.test(content)) hasIndexedDB = true;
        if (/\bdocument\.cookie\b/.test(content)) hasDocumentCookie = true;
        if (/(?:key|code)\s*===?\s*['"]Escape['"]|\bEscape\b/.test(content)) {
          // Check if it's escape key handling
          if (/key(?:Down|Up|Press)?|keyCode\s*===?\s*27/.test(content)) hasEscapeKey = true;
        }

        // Find URLs
        const urls = content.match(/https?:\/\/[a-zA-Z0-9.-]+(?::\d+)?(?:\/[^\s"'>)]*)?/g) || [];
        for (const u of urls) {
          if (!u.includes('bridge.playgama.com') && !u.includes('w3.org') && !u.includes('localhost') && !u.includes('127.0.0.1')) {
            hasExternalUrls.push(u);
          }
        }
      }
    }
  }

  scanDir(distDir);
  check('No localStorage in dist', !hasLocalStorage, 'localStorage usage found in build');
  check('No sessionStorage in dist', !hasSessionStorage, 'sessionStorage usage found in build');
  check('No indexedDB in dist', !hasIndexedDB, 'indexedDB usage found in build');
  check('No document.cookie in dist', !hasDocumentCookie, 'document.cookie usage found in build');
  check('No external URLs (except bridge.playgama.com)', hasExternalUrls.length === 0, `External URLs found: ${[...new Set(hasExternalUrls)].slice(0, 5).join(', ')}`);
  check('No Escape key listeners', !hasEscapeKey, 'Escape key handler detected in build');
}

// 4. Check game.zip if present
if (fs.existsSync(path.resolve('game.zip'))) {
  const stat = fs.statSync(path.resolve('game.zip'));
  const sizeMB = stat.size / 1048576;
  check(
    'game.zip size under 300MB hard limit',
    sizeMB <= 300,
    `Archive size is ${sizeMB.toFixed(2)} MB (>300 MB)`
  );
  check(
    'game.zip size under 10MB target budget',
    sizeMB <= 10,
    `Archive size is ${sizeMB.toFixed(2)} MB (warn >10 MB)`
  );
}

// 5. Check localization dictionaries for forbidden gambling keywords
const banned = [
  'casino', 'казино',
  'bet', 'ставк', 'пари',
  'jackpot', 'джекпот',
  'slot', 'слот',
  'gamble', 'рулетк',
];
const i18nDir = path.resolve('src/i18n');
if (fs.existsSync(i18nDir)) {
  let foundBanned = [];
  for (const f of fs.readdirSync(i18nDir)) {
    if (f.endsWith('.ts')) {
      const content = fs.readFileSync(path.join(i18nDir, f), 'utf8').toLowerCase();
      for (const w of banned) {
        // match whole word or word root
        const re = new RegExp(`\\b${w}`, 'i');
        if (re.test(content)) {
          foundBanned.push(`${f}: "${w}"`);
        }
      }
    }
  }
  check(
    'No gambling terminology in i18n dictionaries',
    foundBanned.length === 0,
    `Banned words found: ${foundBanned.join(', ')}`
  );
}

if (failed) {
  console.error('\nPlaygama compliance scan failed.');
  process.exit(1);
} else {
  console.log('\nPlaygama compliance scan passed successfully!');
}
