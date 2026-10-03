# Security policy

## Reporting

Please report vulnerabilities privately. Do not open a public issue for anything that could put users at risk. Use GitHub's private vulnerability reporting on this repository once it is enabled, or the contact published on hunt.markets once one is stated.

Include what you found, how to reproduce it, and the impact you expect. We aim to acknowledge a report promptly and to keep you updated until it is fixed.

## Scope

In scope:

- The site served from hunt.markets and the code in this repository
- Handling of external data: URLs, images and feed responses
- Anything that could mislead a user about an address or link

Out of scope: third-party feeds (RPC, DefiLlama, DexScreener) and social-engineering attempts that need no flaw in our code.

## What the site already does

- External image URLs must be https, on a dexscreener.com host, with no credentials or port
- External strings are inserted as text, never as markup
- Unstated links and addresses never render as clickable
- The site asks for no keys, seed phrases or signatures

## Phishing notice

Until the contract address appears at the top of hunt.markets, no address is official. Anyone sending you one by message is not speaking for Hunt.
