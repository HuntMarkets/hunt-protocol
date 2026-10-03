// Register pattern: every external fact is one record with a state.
export const STATES = ['stated', 'absent', 'unconfirmed'];

export const records = {
  domain: { state: 'stated', value: 'hunt.markets' },
  chainName: { state: 'stated', value: 'Robinhood Chain' },
  chainId: { state: 'stated', value: '4663' },
  rpc: { state: 'stated', value: 'https://rpc.mainnet.chain.robinhood.com' },
  ca: { state: 'absent', value: null },
  x: { state: 'absent', url: null },
  github: { state: 'absent', url: null },
  palette: { state: 'stated', value: 'sampled from brand and reference files, see tokens.css' },
  favicon: { state: 'stated', value: 'rebuilt from the logo pixel grid' },
};

// Never blanket-reject 0x hex: any 40-nibble hex body, any case, is a valid address shape.
export const isAddress = (s) => typeof s === 'string' && /^0x[0-9a-fA-F]{40}$/.test(s);

// Store the URL, derive the handle.
export function deriveHandle(url) {
  try {
    const seg = new URL(url).pathname.split('/').filter(Boolean)[0];
    return seg ? '@' + seg : null;
  } catch {
    return null;
  }
}

export const linkOf = (r) => (r && r.state === 'stated' && r.url ? r.url : null);

export function validate(rs) {
  const bad = [];
  for (const [k, r] of Object.entries(rs)) {
    if (!STATES.includes(r.state)) bad.push(k + ': bad state');
    else if (r.state === 'stated' && !(r.value || r.url)) bad.push(k + ': stated but empty');
    else if (r.state === 'absent' && (r.value || r.url)) bad.push(k + ': absent but filled');
  }
  if (rs.ca.state === 'stated' && !isAddress(rs.ca.value)) bad.push('ca: not an address');
  return bad;
}
