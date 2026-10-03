import { safeUrl } from './lib/safe.js';
import { records as base, isAddress, deriveHandle, linkOf } from './lib/registry.js';

const q = new URLSearchParams(location.search);
const fixtureMode = q.get('fixture'); // gates only
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fast = reduced || !!fixtureMode;
if (fixtureMode) document.documentElement.dataset.fast = '';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

let records = base;
let feed;

async function boot() {
  if (fixtureMode) {
    const f = await import('./lib/fixture.js');
    records = { ...base, ...f.fixtureRecords(fixtureMode) };
    feed = f.live;
  } else {
    feed = (await import('./lib/data.js')).live;
  }
  renderCA();
  renderSocials();
  renderRegister();
  motion();
  hydrate();
  window.__hunt = { setBlock: (n) => setNum($('#s-block'), n, fmtInt), ready: true };
}

/* ---------- formatting ---------- */
const fmtInt = (n) => Math.round(n).toLocaleString('en-US');
const fmtUsd = (n) => (n >= 1e9 ? '$' + (n / 1e9).toFixed(2) + 'B' : n >= 1e6 ? '$' + (n / 1e6).toFixed(2) + 'M' : n >= 1e3 ? '$' + (n / 1e3).toFixed(1) + 'K' : '$' + n.toFixed(0));
const fmtGas = (n) => (n < 0.01 ? n.toFixed(4) : n.toFixed(3));
const fmtPrice = (n) => (n >= 1 ? '$' + n.toFixed(2) : n >= 0.01 ? '$' + n.toFixed(4) : '$' + n.toPrecision(3));

/* ---------- CA slot ---------- */
function renderCA() {
  const slot = $('#ca-slot');
  const r = records.ca;
  if (r.state === 'stated' && isAddress(r.value)) {
    slot.dataset.state = 'stated';
    slot.innerHTML = '';
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'ca-btn';
    b.setAttribute('aria-label', 'Copy contract address');
    b.innerHTML = '<span class="ca-addr"></span><span class="tag" aria-live="polite">Copy</span>';
    $('.ca-addr', b).textContent = r.value;
    b.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(r.value);
      } catch {
        const t = document.createElement('textarea');
        t.value = r.value;
        document.body.append(t);
        t.select();
        document.execCommand('copy');
        t.remove();
      }
      b.dataset.copied = 'true';
      $('.tag', b).textContent = 'Copied';
      setTimeout(() => {
        delete b.dataset.copied;
        $('.tag', b).textContent = 'Copy';
      }, 1600);
    });
    slot.append(b);
  }
}

/* ---------- socials (link rule) ---------- */
const ICONS = {
  x: '<path d="M18.2 2.5h3.1l-6.8 7.8 8 11.2h-6.3l-4.9-6.8-5.7 6.8H2.5l7.3-8.3L2.1 2.5h6.4l4.4 6.2 5.3-6.2Zm-1.1 17.1h1.7L7.3 4.3H5.5l11.6 15.3Z"/>',
  github: '<path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.55v-2.1c-3.2.7-3.88-1.36-3.88-1.36-.52-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.15.08 1.76 1.19 1.76 1.19 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.42-2.69 5.39-5.25 5.67.41.36.78 1.06.78 2.14v3.17c0 .31.21.66.8.55A11.5 11.5 0 0 0 12 .5Z"/>',
};
function renderSocials() {
  const nav = $('#socials');
  for (const [key, label] of [['x', 'X'], ['github', 'GitHub']]) {
    const url = linkOf(records[key]);
    const svg = `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[key]}</svg>`;
    const el = document.createElement(url ? 'a' : 'span');
    el.className = 'icon' + (url ? '' : ' inert');
    if (url) {
      el.href = url;
      el.target = '_blank';
      el.rel = 'noopener noreferrer';
      el.setAttribute('aria-label', label + ' ' + (deriveHandle(url) || ''));
    } else {
      el.setAttribute('role', 'img');
      el.setAttribute('aria-label', label + ', not stated yet');
    }
    el.dataset.key = key;
    el.innerHTML = svg;
    nav.append(el);
  }
}

/* ---------- register ---------- */
function renderRegister() {
  const rows = [
    ['Domain', records.domain.value, records.domain.state],
    ['Chain', records.chainName.value + ' / id ' + records.chainId.value, records.chainId.state],
    ['RPC', records.rpc.value, records.rpc.state],
    ['Contract address', records.ca.value || 'Nothing to show yet', records.ca.state],
    ['X', linkOf(records.x) ? deriveHandle(records.x.url) : 'Nothing to show yet', records.x.state],
    ['GitHub', linkOf(records.github) ? deriveHandle(records.github.url) : 'Nothing to show yet', records.github.state],
    ['Palette', records.palette.value, records.palette.state],
    ['Mark', records.favicon.value, records.favicon.state],
  ];
  $('#reg').innerHTML = rows
    .map(([k, v, s], i) => `<div class="reg-row" style="--i:${i}"><dt>${k}</dt><dd></dd><span class="badge" data-s="${s}">${s}</span></div>`)
    .join('');
  $$('#reg dd').forEach((d, i) => (d.textContent = rows[i][1]));
}

/* ---------- numbers ---------- */
const state = new WeakMap();
function setNum(el, value, fmt) {
  if (!el) return;
  const prev = state.get(el);
  state.set(el, value);
  el.removeAttribute('data-skel');
  if (prev === undefined) {
    countUp(el, 0, value, fmt);
  } else if (prev !== value) {
    el.textContent = fmt(value);
    el.classList.remove('flash');
    void el.offsetWidth;
    el.classList.add('flash');
  }
  updateTape();
}
function countUp(el, from, to, fmt) {
  if (fast) return void (el.textContent = fmt(to));
  const t0 = performance.now(), dur = 1100;
  const step = (t) => {
    const p = Math.min(1, (t - t0) / dur);
    const e = 1 - Math.pow(2, -10 * p);
    el.textContent = fmt(from + (to - from) * e);
    if (p < 1) requestAnimationFrame(step);
    else el.textContent = fmt(to);
  };
  requestAnimationFrame(step);
}
const dash = (el) => {
  el.removeAttribute('data-skel');
  el.textContent = '—';
};

/* ---------- live ---------- */
function setPill(live, text, extra) {
  $('#pill').dataset.live = String(live);
  $('#pill-text').innerHTML = '<span></span><span class="hide-xs"></span>';
  $('#pill-text').firstChild.textContent = text;
  $('#pill-text').lastChild.textContent = extra ? ' · ' + extra : '';
}
async function hydrate() {
  feed.tvl().then((v) => setNum($('#s-tvl'), v, fmtUsd)).catch(() => dash($('#s-tvl')));
  feed.tokens().then(renderLogos).catch(() => renderLogos([]));
  feed.pairs().then(renderPairs).catch(() => renderPairs([]));
  const tick = async () => {
    try {
      const [b, g] = await Promise.all([feed.block(), feed.gasGwei()]);
      setNum($('#s-block'), b, fmtInt);
      setNum($('#s-gas'), g, fmtGas);
      setPill(true, 'Live', 'block ' + fmtInt(b));
    } catch {
      if ($('#s-block').dataset.skel) {
        dash($('#s-block'));
        dash($('#s-gas'));
      }
      setPill(false, 'Feed offline');
    }
  };
  await tick();
  if (!fixtureMode) setInterval(tick, 4000);
}
function renderPairs(list) {
  const box = $('#pairs');
  $$('.row:not(.head)', box).forEach((r) => r.remove());
  const n = $('#s-pairs');
  if (!list.length) {
    box.insertAdjacentHTML('beforeend', '<div class="row empty">No pools reported by the feed right now.</div>');
    dash(n);
    return;
  }
  setNum(n, list.length, fmtInt);
  list.forEach((p, i) => {
    const row = document.createElement('div');
    row.className = 'row';
    row.setAttribute('role', 'row');
    row.style.cssText = fast ? '' : `animation:rowin .6s var(--ease) both;animation-delay:${i * 70}ms`;
    const up = p.chg >= 0;
    row.innerHTML = '<span class="nm" role="cell"></span><span class="r" role="cell"></span><span class="r hide-s" role="cell"></span><span class="r" role="cell"></span>';
    const c = row.children;
    c[0].innerHTML = '<span></span><small></small>';
    c[0].firstChild.textContent = p.name;
    c[0].lastChild.textContent = p.dex;
    c[1].textContent = fmtPrice(p.price);
    c[2].textContent = fmtUsd(p.liq);
    c[3].textContent = (up ? '+' : '') + p.chg.toFixed(1) + '%';
    box.append(row);
  });
}

/* ---------- logo marquee ---------- */
function renderLogos(list) {
  const box = $('#logos');
  box.removeAttribute('data-skel');
  if (!list.length) return void box.remove();
  let items = list;
  while (items.length < 8) items = items.concat(list);
  const mk = (hidden) => {
    const set = document.createElement('div');
    set.className = 'tape-set';
    if (hidden) set.setAttribute('aria-hidden', 'true');
    for (const t of items) {
      const it = document.createElement('span');
      it.className = 'logo-item';
      const ico = document.createElement('span');
      ico.className = 'logo-ico';
      ico.textContent = (t.symbol[0] || '?').toUpperCase();
      const logo = safeUrl(t.logo);
      if (logo) {
        const img = document.createElement('img');
        img.src = logo;
        img.alt = '';
        img.loading = 'lazy';
        img.decoding = 'async';
        img.referrerPolicy = 'no-referrer';
        img.addEventListener('error', () => img.remove());
        ico.append(img);
      }
      const nm = document.createElement('span');
      nm.className = 'logo-nm';
      nm.textContent = t.name && t.name !== t.symbol ? t.symbol + ' \u00b7 ' + t.name : t.symbol;
      const px = document.createElement('b');
      px.textContent = fmtPrice(t.price);
      const ch = document.createElement('span');
      ch.className = 'logo-chg';
      ch.dataset.dir = t.chg >= 0 ? 'up' : 'down';
      ch.textContent = (t.chg >= 0 ? '+' : '') + t.chg.toFixed(1) + '%';
      it.append(ico, nm, px, ch);
      set.append(it);
    }
    return set;
  };
  $('#logo-track').replaceChildren(mk(false), mk(true), mk(true), mk(true));
}

/* ---------- tape ---------- */
function updateTape() {
  const t = $('#tape');
  const items = [
    ['Chain', records.chainName.value],
    ['Id', records.chainId.value],
    ['Block', state.get($('#s-block')) ? fmtInt(state.get($('#s-block'))) : '—'],
    ['Gas', state.get($('#s-gas')) !== undefined ? fmtGas(state.get($('#s-gas'))) + ' gwei' : '—'],
    ['Locked', state.get($('#s-tvl')) !== undefined ? fmtUsd(state.get($('#s-tvl'))) : '—'],
    ['Pools', state.get($('#s-pairs')) !== undefined ? String(state.get($('#s-pairs'))) : '—'],
  ];
  const set = '<div class="tape-set">' + items.map(([k, v]) => `<span class="tape-item">${k} <b>${v}</b></span>`).join('') + '</div>';
  t.innerHTML = set + set.replace('class="tape-set"', 'class="tape-set" aria-hidden="true"') + set.replace('class="tape-set"', 'class="tape-set" aria-hidden="true"') + set.replace('class="tape-set"', 'class="tape-set" aria-hidden="true"');
  t.style.setProperty('--n', '4');
}

/* ---------- motion ---------- */
function motion() {
  updateTape();
  // staggered reveal: index within parent group
  $$('.reveal').forEach((el) => {
    const sibs = $$(':scope > .reveal', el.parentElement);
    el.style.setProperty('--i', String(Math.max(0, sibs.indexOf(el))));
  });
  if (fast || !('IntersectionObserver' in window)) {
    $$('.reveal').forEach((e) => e.classList.add('in'));
  } else {
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add('in');
        io.unobserve(e.target);
      }
    }), { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    $$('.reveal').forEach((e) => io.observe(e));
  }
  // scroll progress + parallax
  const bar = $('#progress');
  const layers = $$('[data-depth]');
  let raf = 0;
  const frame = () => {
    raf = 0;
    const y = scrollY;
    const max = document.documentElement.scrollHeight - innerHeight;
    bar.style.transform = `scaleX(${max > 0 ? Math.min(1, y / max) : 0})`;
    if (!reduced) layers.forEach((l) => (l.style.transform = `translate3d(0,${(y * Number(l.dataset.depth)).toFixed(1)}px,0)`));
  };
  addEventListener('scroll', () => raf || (raf = requestAnimationFrame(frame)), { passive: true });
  addEventListener('resize', frame);
  frame();
}

boot();
