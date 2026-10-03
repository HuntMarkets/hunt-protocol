// Synthetic data for gates. Nothing here is real.
export const addr = '0xAbCdEf0123456789aBcDeF0123456789abcdef01';
export const fixtureRecords = (mode) => ({
  ca: mode === 'absent' ? { state: 'absent', value: null } : { state: 'stated', value: addr },
  x: mode === 'absent' ? { state: 'absent', url: null } : { state: 'stated', url: 'https://x.com/synthetic_handle' },
  github: mode === 'absent' ? { state: 'absent', url: null } : { state: 'stated', url: 'https://github.com/synthetic-org' },
});
export const live = {
  tokens: async () => [
    { symbol: 'AAA', name: 'Alpha Synthetic', price: 1.2345, chg: 4.2, logo: 'https://dd.dexscreener.com/ds-data/tokens/synthetic/aaa.png' },
    { symbol: 'BBB', name: 'Beta Synthetic', price: 0.0042, chg: -2.1, logo: 'javascript:alert(1)' },
    { symbol: 'CCC', name: 'Gamma Synthetic', price: 12.5, chg: 0.4, logo: 'http://evil.example/x.png' },
  ],
  block: async () => 1234567,
  gasGwei: async () => 0.0123,
  tvl: async () => 48200000,
  pairs: async () => [
    { name: 'AAA / WETH', dex: 'synthdex', price: 1.2345, liq: 820000, vol: 120000, chg: 4.2 },
    { name: 'BBB / WETH', dex: 'synthdex', price: 0.0042, liq: 410000, vol: 98000, chg: -2.1 },
    { name: 'CCC / USDC', dex: 'synthdex', price: 12.5, liq: 220000, vol: 31000, chg: 0.4 },
  ],
};
