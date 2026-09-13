# Dubai Shopping Planner

A personal shopping planner for a Dubai trip: a checklist of everything you plan
to buy, what you expect it to cost, what you actually paid, and how much budget
is left. Built to be used one-handed on a phone while standing in a shop.

It installs to your home screen and **works with no signal at all** — useful in a
mall basement. Everything is stored on your own device; nothing is uploaded.

![Dashboard](docs/screenshot-dashboard.png)

## What it does

- **Dashboard** — total budget, estimated total, spent, remaining, percentage
  used, completion, deals found and spending per category. Every figure is
  derived from the product list; nothing is hard-coded into the UI.
- **Shopping list** — one card per product with image, target price, current
  observed price, price paid, deal verdict, store, notes and a mini price chart.
  Search, five status filters, category filter and nine sort orders.
- **Price tracker** — target / current / lowest / highest / last checked per
  product, a price-history chart, and a per-store comparison table that
  highlights the cheapest sighting.
- **Budget** — quick presets (AED 4,000 / 5,000 / 5,500 / 6,000 / 7,000) plus any
  custom amount, with under / approaching / over-budget status. Going over never
  blocks anything.
- **Add product** — name, price and quantity required; image upload, category,
  brand, store, target price, link and notes optional. Custom products behave
  exactly like preloaded ones.
- **Shopping Mode** — a stripped-back full-screen view for use inside a store:
  image, name, target, best price, store, notes and a large checkbox.
- **Settings** — appearance, JSON export/import, reset to the original plan.

### About the prices

Every preloaded figure is a **planning estimate** gathered before the trip. No
live pricing API is connected and the app never implies otherwise: a product has
no "current price" until you log one yourself, and deal labels are calculated
only from prices you recorded.

Bundled product artwork is hand-drawn illustration shipped with the app, marked
as such in the UI, and never presented as a photo of a specific item for sale.
Upload your own photo on any product to replace it.

## Getting it onto your phone

The planner is a progressive web app, so "installing" means adding it to your
home screen. It then opens full screen with no browser bar, and the whole app is
cached on the device so it runs with the network off.

**Installing needs an `https` address** (or `localhost`) — that is a browser rule
for offline caching, not a choice this app makes. There are two practical routes.

### Option A — GitHub Pages (recommended, fully offline)

A free https address for your own copy. `.github/workflows/deploy.yml` turns
Pages on by itself, so there is no repository setting to change first — it
deploys on every push to the default branch, and can also be run by hand from
**Actions → Deploy to GitHub Pages → Run workflow**.

The published address is:

```
https://jomisir.github.io/purchase-list/
```

Open it on your phone, then follow the steps in **Settings → Install on your
phone**.

After the first load the app is cached. Turn off mobile data and it still opens,
still shows your list, and still records prices and purchases.

### Option B — from your own computer over Wi-Fi (no offline caching)

```bash
npm run build
npm run preview:lan     # prints a Network address like http://192.168.1.20:4173/
```

Open that address on a phone connected to the same Wi-Fi. On iPhone you can
still **Share → Add to Home Screen** and get the full-screen app. Because a LAN
address is plain `http`, the browser will not let it cache itself, so it only
works while your computer is serving it and you are on that network. The app
says so in Settings rather than pretending otherwise.

### What "installed" gets you

- Full-screen launch from the home screen, with its own icon and name.
- Works offline — including logging prices and checking items off.
- Long-press the icon for shortcuts straight into Shopping Mode, Add Product or
  the Price Tracker.
- Your data lives in this device's browser storage. It is not synced anywhere, so
  use **Settings → Export JSON** before clearing browser data or changing phone.
- When a newer version is published, the app fetches it in the background and
  offers a **Reload** button rather than interrupting you mid-shop.

## Running it

```bash
npm install
npm run dev          # development server
npm run dev:lan      # same, reachable from a phone on your Wi-Fi
npm run build        # typecheck + production build into dist/
npm run preview      # serve the production build
npm run preview:lan  # serve it to your Wi-Fi network
npm test             # unit tests
```

The build is fully static (relative asset paths, hash routing), so `dist/` can be
served from any host or sub-path — verified end to end under a `/purchase-list/`
prefix, service worker and manifest included.

## Architecture

```
src/
  types/          domain model (Product, PriceRecord, Settings, AppData)
  data/seed.ts    the preloaded catalogue — pure data, no UI
  lib/
    pwa.ts        service-worker registration, updates, install prompt
    calc.ts       all money/deal/stat maths as pure functions
    money.ts      formatting and price parsing
    transfer.ts   import/export + defensive normalisation of stored data
    url.ts        product-link validation
    image.ts      upload handling: downscale, re-encode, preview
    storage/      persistence adapters behind one async interface
  context/        reducer + provider; the only place state changes
  components/     presentation
  pages/          one file per route
build/
  serviceWorkerPlugin.ts   emits sw.js with this build's real asset names
public/
  manifest.webmanifest     app name, icons, shortcuts, standalone display
  icons/                   192/512 any + maskable, plus an apple-touch-icon
```

Three rules hold the structure together:

1. **Data is never embedded in components.** Products come from `data/seed.ts`,
   flow through the reducer, and reach the UI as props.
2. **All arithmetic lives in `lib/calc.ts`** as pure functions, so budget totals,
   deal detection and price statistics are unit-tested without rendering.
3. **Persistence is an interface.** `lib/storage` exposes an async
   `PersistenceAdapter` (`load` / `save` / `clear`). IndexedDB is the default,
   localStorage the fallback, in-memory the last resort.

### Adding a real price API later

`Product.currentPrice` and `Product.priceHistory` are the only things a price
source would write. A fetcher would dispatch `addPriceRecord` with
`source: 'api'` and every screen updates — no component changes. Manual price
tracking keeps working with or without it.

### How the offline caching works

`build/serviceWorkerPlugin.ts` runs at build time and writes `dist/sw.js`
containing the exact hashed filenames this build produced, plus a cache name
derived from them. The worker precaches that list on install, serves navigations
from the cached shell, and deletes older caches when it activates. A new build
produces a new cache name, so an update is atomic: the old version keeps working
until you press **Reload**.

Every path is resolved against the worker's own scope, which is why the same
build runs unchanged from `/`, from a LAN address, or from a
`/purchase-list/` sub-path.

### Swapping in Supabase

Implement `PersistenceAdapter` against Supabase and return it from
`createPersistence()` in `src/lib/storage/index.ts`. The interface is already
async and the state shape (`AppData`) maps directly to `products`,
`price_records` and `settings` tables.

## Testing

`npm test` runs 66 unit tests covering budget totals, deal thresholds, price
statistics, store comparison, search/sort/filter, every reducer action, the
import/export round trip, URL validation and the integrity of the seed catalogue
(no duplicates, one smartwatch, targets inside their stated ranges, and an
estimated total that adds up to the products themselves).

The UI was additionally driven end-to-end with Playwright across the acceptance
checklist — purchases, price logging, image upload, edit/delete, persistence
across reloads, import/export, over-budget states, Shopping Mode, keyboard
navigation, a 320px-wide viewport and a WCAG AA contrast sweep of every screen in
both themes.

The installable behaviour was verified the same way: manifest and every icon
resolve, the service worker registers and takes control, the precache fills, and
with the network switched fully off the app still cold-starts, renders all 25
products with their artwork, and records a new price. The iOS path was checked
under an iPhone user agent to confirm it shows Share-sheet instructions instead
of a button that would do nothing.

## Phone behaviour

- Bottom tab bar with a centre action button; sticky chrome respects the status
  bar and home-indicator safe areas when launched from the home screen.
- Inputs are 16px on small screens so iOS does not zoom on focus.
- Usable down to 320px wide with no horizontal scrolling.
- Touch targets are at least 36px, and Shopping Mode's checkboxes are 44px.
- Product artwork is bundled SVG, so the whole catalogue renders offline.

## Accessibility

Text meets WCAG AA contrast on every screen in both light and dark themes
(audited programmatically). Budget and deal status is always carried by a word
and an icon, never colour alone. Checkboxes are real inputs with labels, dialogs
trap focus and close on Escape, images carry alt text describing whether they are
an illustration, and controls are at least 36px on touch.
