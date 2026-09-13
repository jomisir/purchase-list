# Dubai Shopping Planner

A personal shopping planner for a Dubai trip: a checklist of everything you plan
to buy, what you expect it to cost, what you actually paid, and how much budget
is left. Built to be used one-handed on a phone while standing in a shop.

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

## Running it

```bash
npm install
npm run dev      # development server
npm run build    # typecheck + production build into dist/
npm run preview  # serve the production build
npm test         # unit tests
```

The build is fully static (relative asset paths, hash routing), so `dist/` can be
served from any host or sub-path.

## Architecture

```
src/
  types/          domain model (Product, PriceRecord, Settings, AppData)
  data/seed.ts    the preloaded catalogue — pure data, no UI
  lib/
    calc.ts       all money/deal/stat maths as pure functions
    money.ts      formatting and price parsing
    transfer.ts   import/export + defensive normalisation of stored data
    url.ts        product-link validation
    image.ts      upload handling: downscale, re-encode, preview
    storage/      persistence adapters behind one async interface
  context/        reducer + provider; the only place state changes
  components/     presentation
  pages/          one file per route
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

## Accessibility

Text meets WCAG AA contrast on every screen in both light and dark themes
(audited programmatically). Budget and deal status is always carried by a word
and an icon, never colour alone. Checkboxes are real inputs with labels, dialogs
trap focus and close on Escape, images carry alt text describing whether they are
an illustration, and controls are at least 36px on touch.
