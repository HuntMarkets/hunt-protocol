import { records } from './registry.js';
import { safeUrl } from './safe.js';

const j = async (url, init) => {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), 8000);
  try {
    const r = await fetch(url, { ...init, signal: c.signal });
    if (!r.ok) throw new Error(String(r.status));
    return await r.json();
  } finally {
    clearTimeout(t);
  }
};

const rpc = async (method) => {
  const o = await j(records.rpc.value, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params: [] }),
  });
  return parseInt(o.result, 16);
};

export const live = {
  block: () => rpc('eth_blockNumber'),
  gasGwei: async () => (await rpc('eth_gasPrice')) / 1e9,
  async tvl() {
    const list = await j('https://api.llama.fi/v2/chains');
    const hit = list.find((c) => Number(c.chainId) === Number(records.chainId.value)) || list.find((c) => /robinhood/i.test(c.name));
    if (!hit) throw new Error('not listed');
    return hit.tvl;
  },
  async tokens() {
    const [o, prof] = await Promise.all([
      j('https://api.dexscreener.com/latest/dex/search?q=robinhood'),
      j('https://api.dexscreener.com/token-profiles/latest/v1').catch(() => []),
    ]);
    const icons = new Map();
    for (const p of Array.isArray(prof) ? prof : []) {
      if (/robinhood/i.test(p.chainId || '') && p.tokenAddress) icons.set(String(p.tokenAddress).toLowerCase(), p.icon);
    }
    const seen = new Set();
    const out = [];
    const pairs = (o.pairs || []).filter((p) => /robinhood/i.test(p.chainId)).sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0));
    for (const p of pairs) {
      const addr = String(p.baseToken?.address || '').toLowerCase();
      if (!addr || seen.has(addr)) continue;
      seen.add(addr);
      out.push({
        symbol: String(p.baseToken.symbol || '?'),
        name: String(p.baseToken.name || p.baseToken.symbol || ''),
        price: Number(p.priceUsd) || 0,
        chg: Number(p.priceChange?.h24) || 0,
        logo: safeUrl(p.info?.imageUrl) || safeUrl(icons.get(addr)),
      });
      if (out.length >= 12) break;
    }
    return out;
  },
  async pairs() {
    const o = await j('https://api.dexscreener.com/latest/dex/search?q=robinhood');
    return (o.pairs || [])
      .filter((p) => /robinhood/i.test(p.chainId))
      .sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0))
      .slice(0, 6)
      .map((p) => ({
        name: p.baseToken.symbol + ' / ' + p.quoteToken.symbol,
        dex: p.dexId,
        price: Number(p.priceUsd) || 0,
        liq: p.liquidity?.usd || 0,
        vol: p.volume?.h24 || 0,
        chg: p.priceChange?.h24 ?? 0,
      }));
  },
};
