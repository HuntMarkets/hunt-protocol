# Contributing to Hunt

Thanks for helping. Small, well-aimed changes are easiest to review.

## Setup

```bash
npm run build
npm run gates
```

Both must pass before you open a change. Gates need Edge or Chrome.

## Ground rules

1. **Facts are records.** An outside fact (address, link, handle) goes in `src/lib/registry.js` with a state. Store a URL and derive the handle; never hard-code a link for something unstated.
2. **Colour lives in `src/tokens.css`.** Do not add colour literals anywhere else. A new colour must be sampled from a brand file and recorded with its pixel coordinate.
3. **Do not reject valid hex.** Address checks must accept any `0x` plus 40 hex digits.
4. **Motion has a fallback.** Anything animated must resolve instantly under `prefers-reduced-motion`.
5. **Layout limits.** No `ch` units, no horizontal overflow from 360 to 1440 px wide, tap targets of 48 px or more.
6. **Original words.** Copy is written fresh. Do not paste text from other products.
7. **Gates stay small.** The suite is capped at thirty checks, uses synthetic data, and must finish quickly.

## Making a change

- Keep a change to one concern.
- Describe what you saw and what you expect now.
- If you touch visible copy, run the gates; the copy check will tell you if wording collides with the reference text.

## Reporting a bug

Include browser, viewport width and what you expected. For anything security-related, use `.github/SECURITY.md` instead of a public report.
