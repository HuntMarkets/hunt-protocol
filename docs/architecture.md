# Architecture

This describes the repository as it stands, then the intended shape of the market layer. Market contracts are not built yet.

## Site (built)

```
src/index.html   -> structure and copy
src/tokens.css   -> every colour literal, with pixel provenance
src/styles.css   -> layout, motion, reduced-motion fallbacks
src/main.js      -> rendering, counters, reveal, progress, parallax
src/lib/
  registry.js    -> one record per outside fact: stated | absent | unconfirmed
  safe.js        -> https-only, host-allowlisted URL filter for external images
  data.js        -> RPC, DefiLlama and DexScreener readers (8 s timeout each)
  fixture.js     -> synthetic data used only by the gates
```

### Rules the code enforces

- A link renders only for a stated record; otherwise an inert icon is shown.
- Address validation accepts any 40-nibble hex body after `0x`, in any case.
- External text is inserted as text; external images pass through `safeUrl`.
- No `ch` units; every tap target is at least 48 px.

### Build and gates

`scripts/build.mjs` copies `src/` to `dist/`. `scripts/gates.mjs` serves `dist/` locally, drives headless Edge or Chrome over the DevTools protocol, and runs at most thirty checks against synthetic fixtures only. The run takes well under five minutes.

## Market layer (intended)

```
question  ->  market contract  ->  Yes share / No share  <->  USDC
                     |
              resolution rule  ->  redeem winning share at 1 USDC
```

- One contract per market, holding USDC collateral.
- A Yes share and a No share together always redeem for exactly one USDC.
- The front end reads prices from chain state and never holds keys or funds.

Open items: resolution source, fee model, dispute window. These are tracked in `docs/whitepaper.md`.
