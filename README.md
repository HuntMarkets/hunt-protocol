# Hunt

Hunt turns a plain question about the world into a two-sided market on Robinhood Chain. Back Yes or No with USDC, and read the price of each side as the crowd's running estimate.

Domain: hunt.markets · Chain: Robinhood Chain (id 4663)

## What is in this repository

| Path | Purpose |
| --- | --- |
| `src/` | The marketing site: static HTML, CSS and ES modules, no framework |
| `scripts/build.mjs` | Copies `src/` to `dist/` and renders the favicon |
| `scripts/gates.mjs` | Release gates: static checks plus headless-browser checks at five widths |
| `brand/`, `reference/` | Supplied brand files and design references |
| `docs/` | Whitepaper, token notes, roadmap and architecture |

## Run it

```bash
npm run build
npm run gates
```

There are no runtime dependencies. The gates need Microsoft Edge or Chrome; set `BROWSER` to a binary path if yours lives somewhere unusual.

## Live data

The site reads three open feeds and degrades quietly when one is silent:

- Block height and gas from the chain RPC
- Chain value locked from DefiLlama
- Top pools and token logos from DexScreener, filtered through a strict URL allowlist

## House rules

- Every outside fact (contract address, social links) is a record with a state: stated, absent or unconfirmed. Nothing renders as true until it is stated.
- Colour literals live in one file, `src/tokens.css`, each traced to a real pixel in the brand files.
- Motion respects `prefers-reduced-motion`.

## Status

Early. The contract address and social accounts are not yet published, and the site shows them as pending. See `docs/roadmap.md`.

See `.github/CONTRIBUTING.md` to help and `.github/SECURITY.md` to report a problem. Released under the MIT licence.
