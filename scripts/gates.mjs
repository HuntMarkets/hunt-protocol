// Gates: synthetic fixtures only, fast clock, one headless Edge/Chrome driven over raw CDP.
import { spawn } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync, mkdtempSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const results = [];
const gate = async (name, fn) => {
  try {
    const r = await fn();
    results.push([name, r === undefined || r === true ? '' : null, r]);
    if (r !== undefined && r !== true) throw new Error(String(r));
    console.log('PASS', name);
  } catch (e) {
    results.push([name, 'fail']);
    console.log('FAIL', name, '-', e.message);
  }
};
const must = (c, m) => { if (!c) throw new Error(m); };

const walk = (d, acc = []) => {
  for (const n of readdirSync(d)) {
    if (n === 'node_modules') continue;
    const p = join(d, n);
    statSync(p).isDirectory() ? walk(p, acc) : acc.push(p);
  }
  return acc;
};
const srcFiles = walk(join(root, 'src'));
const read = (f) => readFileSync(f, 'utf8');

/* ---------- static gates ---------- */
const reg = await import(pathToFileURL(join(root, 'src/lib/registry.js')).href);

await gate('01 build output present', () => must(['index.html', 'main.js', 'styles.css', 'tokens.css', 'favicon.svg'].every((f) => existsSync(join(dist, f))), 'dist incomplete'));
await gate('02 colour literals only in tokens.css', () => {
  const re = /#[0-9a-fA-F]{3,8}\b|\b(rgb|rgba|hsl|hsla|oklch|oklab|lab|lch|hwb)\(/;
  const bad = srcFiles.filter((f) => !/tokens\.css$/.test(f) && re.test(read(f)));
  must(!bad.length, 'literals in ' + bad.join(', '));
});
await gate('03 palette traced to sampled pixels', () => {
  const t = read(join(root, 'src/tokens.css'));
  const head = t.slice(0, t.indexOf(':root'));
  const lits = [...t.slice(t.indexOf(':root')).matchAll(/rgb\(\s*(\d+) (\d+) (\d+)\s*\)/g)].map((m) => m.slice(1, 4).join(' '));
  must(lits.length >= 5 && lits.every((l) => head.includes('rgb(' + l + ')') && new RegExp('rgb\\(' + l + '\\)[^\\n]*@ \\(\\d+, \\d+\\)').test(head)), 'literal without pixel provenance');
});
await gate('04 no ch units', () => must(!srcFiles.filter((f) => /\.(css|html|js)$/.test(f)).some((f) => /\d(ch)\b/.test(read(f))), 'ch unit used'));
await gate('05 repo hygiene', () => {
  const all = walk(root).map((f) => f.slice(root.length + 1).replace(/\\/g, '/'));
  must(!all.some((f) => /(^|\/)CLAUDE\.md$/i.test(f) || f.startsWith('.claude/')), 'forbidden file');
  const txt = all.filter((f) => /\.(js|mjs|css|html|json|svg)$/.test(f) && !f.startsWith('reference/') && !f.endsWith('gates.mjs'));
  must(!txt.some((f) => /Co-Authored-By|Generated with|Claude Code|\bAnthropic\b/i.test(readFileSync(join(root, f), 'utf8'))), 'AI attribution found');
});
await gate('06 registry: every record valid', () => { const b = reg.validate(reg.records); must(!b.length, b.join('; ')); });
await gate('07 registry: CA absent and stated branches both valid', () => {
  const r = reg.records;
  const syn = '0x' + 'ab12'.repeat(10);
  // synthetic branches, independent of the live record
  must(!reg.validate({ ...r, ca: { state: 'absent', value: null } }).length, 'absent branch rejected');
  must(!reg.validate({ ...r, ca: { state: 'stated', value: syn } }).length, 'stated branch rejected');
  must(reg.validate({ ...r, ca: { state: 'absent', value: syn } }).length, 'absent+filled accepted');
  must(reg.validate({ ...r, ca: { state: 'stated', value: '0x12' } }).length, 'bad stated address accepted');
  // live record must be consistent in whichever branch it is in
  must(!reg.validate(r).length, 'live registry invalid: ' + reg.validate(r).join('; '));
  must(r.x.state === 'absent' && !r.x.url && r.github.state === 'absent' && !r.github.url, 'x/github filled');
});
await gate('08 address check accepts any 0x hex body', () => {
  const lo = '0x' + 'ab12'.repeat(10), up = '0x' + 'AB12'.repeat(10), mix = '0xAbCdEf0123456789aBcDeF0123456789abcdef01';
  must([lo, up, mix].every(reg.isAddress), 'valid rejected');
  must(!reg.isAddress('0x123') && !reg.isAddress('0x' + 'zz'.repeat(20)) && !reg.isAddress(null), 'invalid accepted');
});
await gate('09 handle derived from stored url', () => must(reg.deriveHandle('https://x.com/some_name/') === '@some_name' && reg.deriveHandle('nope') === null, 'derive failed'));
await gate('10 skeletons ship in markup', () => must((read(join(dist, 'index.html')).match(/class="skeleton"/g) || []).length >= 4, 'missing skeletons'));
await gate('11 reduced-motion fallback in css', () => must(/prefers-reduced-motion:\s*reduce/.test(read(join(root, 'src/styles.css'))), 'no fallback'));
await gate('12 copy: no 2-gram shared with reference', () => {
  const refFile = join(root, 'reference/punt-text.txt');
  if (!existsSync(refFile)) return true;
  const words = (s) => s.toLowerCase().replace(/&middot;|&mdash;/g, ' ').replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(Boolean);
  const stop = new Set('a an the of to in on at by for and or but is are be it its as with from this that you your we our no not all one more any'.split(' '));
  const grams = (w) => new Set(w.slice(1).map((x, i) => [w[i], x]).filter(([a, b]) => !(stop.has(a) || stop.has(b))).map((p) => p.join(' ')));
  const ref = grams(words(read(refFile)));
  const html = read(join(root, 'src/index.html')).replace(/<(script|style)[\s\S]*?<\/\1>/g, '').replace(/<[^>]+>/g, ' ');
  const mine = [...grams(words(html + ' ' + [...read(join(root, 'src/main.js')).matchAll(/'([A-Z][^']{8,})'/g)].map((m) => m[1]).join(' ')))];
  const proper = new Set(['robinhood chain']); // the chain's own name, unavoidable
  const hit = mine.filter((g) => ref.has(g) && !proper.has(g));
  must(!hit.length, 'shared: ' + hit.slice(0, 6).join(' | '));
});

await gate('29 safeUrl: https + dexscreener hosts only', async () => {
  const { safeUrl } = await import(pathToFileURL(join(root, 'src/lib/safe.js')).href);
  must(safeUrl('https://dd.dexscreener.com/a.png') && safeUrl('https://cdn.dexscreener.com/b.png'), 'good url rejected');
  const bad = ['javascript:alert(1)', 'http://dd.dexscreener.com/a.png', 'https://evil.example/a.png', 'https://dexscreener.com.evil.example/a.png', 'https://u:p@dd.dexscreener.com/a.png', 'data:image/png;base64,AA', '', null, 5];
  must(bad.every((u) => safeUrl(u) === null), 'bad url accepted');
});

/* ---------- browser gates ---------- */
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };
const server = createServer((req, res) => {
  const p = new URL(req.url, 'http://x').pathname;
  const f = join(dist, p === '/' ? 'index.html' : p);
  if (!f.startsWith(dist) || !existsSync(f) || statSync(f).isDirectory()) return res.writeHead(404).end();
  res.writeHead(200, { 'content-type': mime[extname(f)] || 'application/octet-stream' }).end(readFileSync(f));
}).listen(0);
const base = 'http://127.0.0.1:' + server.address().port + '/';

const exe = [
  process.env.BROWSER,
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome', '/usr/bin/chromium',
].find((p) => p && existsSync(p));
const PORT = 9300 + Math.floor(Math.random() * 600);
let proc, ws, nid = 0;
const pending = new Map();
const send = (method, params = {}, sessionId) => new Promise((res, rej) => {
  const id = ++nid;
  pending.set(id, { res, rej });
  ws.send(JSON.stringify({ id, method, params, sessionId }));
});
let browserOk = false;
try {
  must(exe, 'no Edge/Chrome found (set BROWSER)');
  const dir = mkdtempSync(join(tmpdir(), 'hunt-gates-'));
  proc = spawn(exe, ['--headless=new', `--remote-debugging-port=${PORT}`, '--no-first-run', '--disable-gpu', '--user-data-dir=' + dir, 'about:blank'], { stdio: 'ignore' });
  let info;
  for (let i = 0; i < 60 && !info; i++) {
    try { info = await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json(); } catch { await new Promise((r) => setTimeout(r, 150)); }
  }
  must(info, 'browser did not start');
  ws = new WebSocket(info.webSocketDebuggerUrl);
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
  ws.onmessage = (m) => {
    const d = JSON.parse(m.data);
    const p = d.id && pending.get(d.id);
    if (p) { pending.delete(d.id); d.error ? p.rej(new Error(d.error.message)) : p.res(d.result); }
  };
  browserOk = true;
} catch (e) { console.log('browser unavailable:', e.message); }

async function page(url, { w = 1440, h = 900, reduce = false, init } = {}) {
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  const s = (m, p) => send(m, p, sessionId);
  await s('Page.enable');
  await s('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: false });
  if (reduce) await s('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  if (init) await s('Page.addScriptToEvaluateOnNewDocument', { source: init });
  await s('Page.navigate', { url });
  const ev = async (expr) => {
    const r = await s('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.text + ' ' + (r.exceptionDetails.exception?.description || ''));
    return r.result.value;
  };
  for (let i = 0; i < 80; i++) { if (await ev('!!(window.__hunt&&window.__hunt.ready)').catch(() => false)) break; await new Promise((r) => setTimeout(r, 50)); }
  await new Promise((r) => setTimeout(r, 250));
  return { ev, close: () => send('Target.closeTarget', { targetId }) };
}

const measure = `(() => {
  const de = document.documentElement;
  const over = de.scrollWidth - innerWidth;
  const small = [...document.querySelectorAll('a[href],button,[role=button]')].map((e) => { const r = e.getBoundingClientRect(); return { t: e.tagName + '.' + e.className, w: r.width, h: r.height }; }).filter((r) => r.h < 47.5 || r.w < 47.5);
  const wide = [...document.querySelectorAll('body *')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.right > innerWidth + 1 && !e.closest('.tape,.rings'); }).map((e) => e.tagName + '.' + e.className).slice(0, 5);
  return JSON.stringify({ over, small, wide });
})()`;

if (browserOk) {
  for (const w of [360, 390, 430, 1366, 1440]) {
    await gate(`${13 + [360, 390, 430, 1366, 1440].indexOf(w)} w${w}: no overflow, taps >= 48px`, async () => {
      const p = await page(base + '?fixture=1', { w, h: w < 600 ? 800 : 900 });
      const m = JSON.parse(await p.ev(measure));
      await p.close();
      must(m.over <= 0, 'horizontal overflow ' + m.over);
      must(!m.wide.length, 'element past edge: ' + m.wide.join(','));
      must(!m.small.length, 'small taps: ' + JSON.stringify(m.small));
    });
  }
  await gate('18 CA slot is first thing in page, full address shown', async () => {
    const p = await page(base + '?fixture=1', { w: 360 });
    const r = JSON.parse(await p.ev(`JSON.stringify({top: document.querySelector('#ca-slot').getBoundingClientRect().top, text: document.querySelector('.ca-addr').textContent, sticky: getComputedStyle(document.querySelector('.top')).position})`));
    await p.close();
    must(r.top < 80 && r.sticky === 'sticky' && /^0x[0-9a-fA-F]{40}$/.test(r.text), JSON.stringify(r));
  });
  await gate('19 CA click copies the full address', async () => {
    const p = await page(base + '?fixture=1', { init: 'window.__copied=null;Object.defineProperty(navigator,"clipboard",{value:{writeText:async(t)=>{window.__copied=t}},configurable:true})' });
    const r = await p.ev(`(async()=>{document.querySelector('.ca-btn').click();await new Promise(r=>setTimeout(r,80));return JSON.stringify({c:window.__copied,s:document.querySelector('.ca-btn').dataset.copied})})()`);
    await p.close();
    const o = JSON.parse(r);
    must(/^0x[0-9a-fA-F]{40}$/.test(o.c) && o.s === 'true', r);
  });
  await gate('20 absent: CA inert, no date, socials have no href', async () => {
    const p = await page(base + '?fixture=absent');
    const r = JSON.parse(await p.ev(`JSON.stringify({btn: !!document.querySelector('.ca-btn'), links: document.querySelectorAll('#socials a').length, icons: document.querySelectorAll('#socials .icon').length, date: /\\b(20\\d\\d|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\\b/i.test(document.querySelector('#ca-slot').textContent)})`));
    await p.close();
    must(!r.btn && r.links === 0 && r.icons === 2 && !r.date, JSON.stringify(r));
  });
  await gate('21 stated: socials link out, handle derived', async () => {
    const p = await page(base + '?fixture=1');
    const r = JSON.parse(await p.ev(`JSON.stringify([...document.querySelectorAll('#socials a')].map(a=>[a.href,a.getAttribute('aria-label')]))`));
    await p.close();
    must(r.length === 2 && r[0][1] === 'X @synthetic_handle' && r[1][1] === 'GitHub @synthetic-org', JSON.stringify(r));
  });
  await gate('22 live values land, skeletons cleared', async () => {
    const p = await page(base + '?fixture=1');
    const r = JSON.parse(await p.ev(`JSON.stringify({skel: document.querySelectorAll('[data-skel]').length, tvl: document.querySelector('#s-tvl').textContent, block: document.querySelector('#s-block').textContent, rows: document.querySelectorAll('#pairs .row:not(.head)').length, pill: document.querySelector('#pill').dataset.live})`));
    await p.close();
    must(r.skel === 0 && r.tvl === '$48.20M' && r.block === '1,234,567' && r.rows === 3 && r.pill === 'true', JSON.stringify(r));
  });
  await gate('23 value change flashes', async () => {
    const p = await page(base + '?fixture=1');
    const r = await p.ev(`(()=>{window.__hunt.setBlock(1234999);return JSON.stringify({f:document.querySelector('#s-block').classList.contains('flash'),t:document.querySelector('#s-block').textContent})})()`);
    await p.close();
    const o = JSON.parse(r);
    must(o.f && o.t === '1,234,999', r);
  });
  await gate('24 scroll progress bar reaches full', async () => {
    const p = await page(base + '?fixture=1');
    const v = await p.ev(`(async()=>{scrollTo({top:document.documentElement.scrollHeight,behavior:"instant"});await new Promise(r=>setTimeout(r,200));return JSON.stringify([scrollY,document.querySelector("#progress").style.transform])})()`);
    await p.close();
    must(v.includes("scaleX(1)"), v);
  });
  await gate('25 reveals become visible on scroll', async () => {
    const p = await page(base + '?fixture=1', { reduce: false });
    const v = await p.ev(`(async()=>{for(let y=0;y<=document.documentElement.scrollHeight;y+=300){scrollTo(0,y);await new Promise(r=>setTimeout(r,40))}await new Promise(r=>setTimeout(r,300));return document.querySelectorAll('.reveal:not(.in)').length})()`);
    await p.close();
    must(v === 0, v + ' still hidden');
  });
  await gate('26 reduced motion: instant, no running marquee', async () => {
    const p = await page(base + '?fixture=1', { reduce: true });
    const r = JSON.parse(await p.ev(`JSON.stringify({hidden: [...document.querySelectorAll('.reveal')].filter(e=>getComputedStyle(e).opacity!=='1').length, tape: getComputedStyle(document.querySelector('.tape-track')).animationName})`));
    await p.close();
    must(r.hidden === 0 && r.tape === 'none', JSON.stringify(r));
  });
  await gate('27 status pill pulses when live', async () => {
    const p = await page(base + '?fixture=1');
    const a = await p.ev(`getComputedStyle(document.querySelector('.pill .dot')).animationName`);
    await p.close();
    must(a === 'pulse-dot', a);
  });
  await gate('30 logo marquee: items render, unsafe logos dropped, pauses on hover', async () => {
    const p = await page(base + '?fixture=1');
    const r = JSON.parse(await p.ev(`JSON.stringify({items: document.querySelectorAll('#logo-track .tape-set:first-child .logo-item').length, srcs: [...document.querySelectorAll('#logo-track img')].map(i=>i.src), text: document.querySelector('#logo-track .logo-item').textContent, skel: document.querySelectorAll('#logos .skeleton').length, anim: getComputedStyle(document.querySelector('#logo-track')).animationName})`));
    await p.close();
    const css = read(join(root, 'src/styles.css'));
    must(r.items >= 8 && r.skel === 0 && r.anim === 'tape' && /AAA/.test(r.text) && /1\.23/.test(r.text), JSON.stringify(r));
    must(r.srcs.length > 0 && r.srcs.every((s) => /^https:\/\/dd\.dexscreener\.com\//.test(s)), 'unsafe img src ' + r.srcs);
    must(css.includes('.tape:hover .tape-track{animation-play-state:paused}'), 'no hover pause');
  });
  await gate('28 parallax layers move on scroll', async () => {
    const p = await page(base + '?fixture=1');
    const t = await p.ev(`(async()=>{scrollTo({top:400,behavior:"instant"});await new Promise(r=>setTimeout(r,150));return document.querySelector('[data-depth]').style.transform})()`);
    await p.close();
    must(/translate3d\(0px?,\s*[1-9]/.test(t), t);
  });
}

/* ---------- wrap up ---------- */
ws?.close();
if (proc) spawn('taskkill', ['/pid', String(proc.pid), '/t', '/f'], { stdio: 'ignore' });
server.close();
const failed = results.filter((r) => r[1] === 'fail').length;
if (!browserOk) { console.log('browser gates SKIPPED'); }
console.log(`\n${results.length - failed}/${results.length} gates passed`);
process.exit(failed || !browserOk ? 1 : 0);
