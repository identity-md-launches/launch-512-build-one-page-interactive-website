# NFT Pulse

A one-page, static website that turns the last 24 hours of transfer activity for an Ethereum
NFT collection into a visual "pulse" dashboard. Paste an ERC-721 or ERC-1155 contract address
and the site shows:

- recent transfer count, unique wallets, the most active hour and the largest burst inside a
  10-minute window;
- an activity meter (Quiet, Active, Hot, Explosive) driven by transfers per hour over the most
  recent six hours;
- a pulse animation whose period shortens as that rate rises (2.4 s at rest, floored at 0.4 s);
- a transfers-per-hour chart with a table alternative;
- a newest-first timeline with token ID, sender, receiver, timestamp and Etherscan link;
- copy buttons for the contract address and every wallet address.

Everything is read-only from a public JSON-RPC endpoint in the browser. There is no wallet
connection, no private key, no signature, no backend and no API key.

## Stack

Vite 5, React 18, TypeScript 5. No component library, no wallet libraries. Styling is plain
CSS with two-tier custom-property tokens (see `DESIGN.md`). Unit tests run on Vitest.

## Install

Requires Node.js 18 or newer (developed on Node 24.9, npm 11.6).

```sh
npm install
```

## Develop and preview

```sh
npm run dev       # Vite dev server with hot reload
npm run preview   # serves the committed dist/ export locally
```

`npm run preview` prints a local URL. The export uses relative asset URLs (`base: './'` in
`vite.config.ts`), so it also works when opened from any subpath, an IPFS gateway path or an
ENS name. Only hash routing is used: `#/0x…` deep-links straight to a collection.

## Rebuild

```sh
npm run typecheck   # tsc --noEmit
npm run test        # vitest (analysis, ABI decoding, level thresholds)
npm run build       # writes dist/
npm run check       # all three in sequence
```

Commit `dist/` after rebuilding: the publisher serves the committed export and does not rebuild.

## Publish

`dist/` is self-contained: `index.html`, `assets/*.js`, `assets/*.css` and `favicon.svg`.
Upload that folder to any static host (GitHub Pages, Netlify, Cloudflare Pages, S3, an IPFS
pinning service). No server-side rewrites are needed. With the IdentityMD daemon:

```sh
imd site publish dist --name nft-pulse
```

## Data source

By default the site reads from `https://ethereum-rpc.publicnode.com`. Users can point it at
another mainnet JSON-RPC endpoint from the "Data source" disclosure in the footer; the choice
is stored in `localStorage` only. The scan covers the latest 7,200 blocks (about 24 hours),
which is the range public nodes serve without an archive key. Contracts that do not report an
NFT interface through ERC-165 are probed over the newest 100 blocks first, so a busy fungible
token is rejected quickly instead of after a full scan.

## Validation record

All commands were run on 2026-09-30 against the final source, on Linux with Node 24.9.0.

| Command | Result |
| --- | --- |
| `npm run typecheck` | exit 0, no errors |
| `npm run test` | exit 0, 12 tests passed (`src/lib/analyze.test.ts`) |
| `npm run build` | exit 0, `dist/index.html` 0.78 kB, CSS 21.8 kB (4.9 kB gzip), JS 172.2 kB (56.0 kB gzip) |
| `node test/scratch/verify.mjs` (Playwright, headless Chromium 154) | exit 0, 40/40 checks passed, no console errors or warnings, no failed requests |

The browser script serves `dist/` under a `/preview/` subpath on a random port, so broken
relative URLs would have been visible. It exercised, on the real export: empty and malformed
submissions (inline error, `aria-invalid`, focus moved to the field), a wallet address
(rejected as "No contract at this address"), an ERC-20 contract (rejected as "Not an NFT
collection" in about 1.3 s), a real collection (Pudgy Penguins: 40 transfers, 33 wallets,
level Quiet, pulse period 1.99 s), the copy buttons (clipboard content checked and the
"Copied" state announced), pause/resume of the pulse, the hourly table toggle, "Show more",
the `hashchange` deep link, the keyboard tab order with a visible focus ring at every stop,
`prefers-reduced-motion: reduce` (all animations off), and horizontal-overflow plus 24×24 px
hit-area checks at 320, 375, 768 and 1280 px widths. Rendered contrast was measured from
computed styles; the lowest text pair is 7.57:1 (muted text on a card).

Screenshots and the full six-domain design review live in `artifacts/validation.md` and
`artifacts/screenshots/`. Known limitations are recorded there: no screen-reader session, no
physical device, no browser-native 200% zoom, no Windows High Contrast run, and live-data
checks depend on the public RPC being available.

## Project layout

```
index.html              entry document
public/favicon.svg      icon, copied into dist/
src/main.tsx            React root
src/App.tsx             page state machine: idle → loading → ready | error
src/components/         SearchForm, PulseMeter, StatTiles, HourlyChart, Timeline,
                        CollectionHeader, CopyButton, Settings, Skeleton, Icons
src/lib/rpc.ts          minimal JSON-RPC client (single + batch)
src/lib/abi.ts          event topics, selectors, ABI decoding helpers
src/lib/collection.ts   contract checks, log scan, timestamp resolution
src/lib/analyze.ts      pure metrics: counts, wallets, hour buckets, burst, level, pulse period
src/lib/format.ts       number, address and time formatting
src/styles.css          design tokens and all component styles
dist/                   committed production export
DESIGN.md               implemented design system
```
