import type { Category, Currency, Product } from '@/types'

/**
 * The planner's starting catalogue.
 *
 * Every price here is a PLANNING ESTIMATE gathered while researching the trip —
 * not a live Dubai price. The app never presents them as anything else; real
 * prices arrive when the user logs what they actually see in a store.
 */

export const SEED_VERSION = 1
export const DEFAULT_BUDGET = 5500
export const DEFAULT_CURRENCY: Currency = 'AED'

export interface SeedProduct {
  id: string
  name: string
  category: Category
  brand?: string
  imageKey?: string
  quantity: number
  /** Per-unit planning estimate. */
  estimatedPrice: number
  /** Per-unit target. */
  targetPrice: number
  targetMin?: number
  targetMax?: number
  store?: string
  productUrl?: string
  notes?: string
}

export const SEED_PRODUCTS: SeedProduct[] = [
  // ---------------------------------------------------------------- Electronics
  {
    id: 'seed-iphone-14-pro',
    name: 'Used iPhone 14 Pro 128GB',
    category: 'Electronics',
    brand: 'Apple',
    imageKey: 'iphone-14-pro',
    quantity: 1,
    estimatedPrice: 1550,
    targetPrice: 1550,
    targetMin: 1450,
    targetMax: 1700,
    notes: [
      '128GB preferred',
      '95%+ battery health preferred',
      'Check Parts & Service History',
      'Check Face ID',
      'Check cameras',
      'Check display',
      'Check True Tone',
      'Check charging port',
      'Check IMEI / carrier status',
      'Prefer legitimate warranty or receipt',
    ].join('\n'),
  },
  {
    id: 'seed-power-bank',
    name: '20,000 mAh MagSafe Power Bank',
    category: 'Electronics',
    imageKey: 'power-bank',
    quantity: 1,
    estimatedPrice: 179,
    targetPrice: 180,
    targetMax: 180,
    notes: 'Target is AED 180 or below.\nMagSafe / magnetic attach for the iPhone 14 Pro.',
  },
  {
    id: 'seed-gan-charger',
    name: '65–100W GaN Charger',
    category: 'Electronics',
    imageKey: 'gan-charger',
    quantity: 1,
    estimatedPrice: 140,
    targetPrice: 140,
    targetMin: 100,
    targetMax: 180,
    notes: 'Preferred brands: UGREEN, Anker, Baseus, Belkin.\nMulti-port USB-C preferred.',
  },
  {
    id: 'seed-jbl-headphones',
    name: 'JBL Headphones',
    category: 'Electronics',
    brand: 'JBL',
    imageKey: 'jbl-headphones',
    quantity: 1,
    estimatedPrice: 220,
    targetPrice: 220,
    targetMin: 150,
    targetMax: 300,
    notes: 'Over-ear. Compare Tune / Live series before deciding.',
  },
  {
    id: 'seed-jbl-earbuds',
    name: 'JBL Earbuds',
    category: 'Electronics',
    brand: 'JBL',
    imageKey: 'jbl-earbuds',
    quantity: 1,
    estimatedPrice: 150,
    targetPrice: 150,
    targetMin: 100,
    targetMax: 200,
  },
  {
    id: 'seed-smartwatch',
    name: 'Garmin Smartwatch (or alternative)',
    category: 'Electronics',
    brand: 'Garmin',
    imageKey: 'smartwatch',
    quantity: 1,
    estimatedPrice: 650,
    targetPrice: 650,
    targetMin: 500,
    targetMax: 800,
    notes: [
      'Must pair and work properly with an iPhone 14 Pro.',
      'Possible alternatives: Amazfit, Huawei Watch GT series.',
      'Only one smartwatch is planned — add an alternative as its own product if you find a better option.',
    ].join('\n'),
  },
  {
    id: 'seed-dji-osmo-mobile-7',
    name: 'DJI Osmo Mobile 7',
    category: 'Filming',
    brand: 'DJI',
    imageKey: 'dji-osmo-mobile',
    quantity: 1,
    estimatedPrice: 230,
    targetPrice: 230,
    targetMin: 210,
    targetMax: 250,
    notes: 'Check the box is sealed and includes the tripod / grip.',
  },

  // --------------------------------------------------------------------- Shoes
  {
    id: 'seed-shoes',
    name: 'Comfortable Shoes',
    category: 'Shoes',
    imageKey: 'shoes',
    quantity: 5,
    estimatedPrice: 90,
    targetPrice: 90,
    targetMin: 70,
    targetMax: 110,
    notes: [
      'Estimated total AED 450 for 5 pairs (target total AED 350–550).',
      'Prioritise: comfort, cushioning, durable outsole, strong stitching, breathability, proper fit.',
      'Buy legitimate budget or unbranded shoes rather than counterfeit branded products.',
    ].join('\n'),
  },

  // ------------------------------------------------------------------ Clothing
  {
    id: 'seed-clothing-haul',
    name: 'Clothing Haul',
    category: 'Clothing',
    imageKey: 'clothing',
    quantity: 1,
    estimatedPrice: 735,
    targetPrice: 735,
    notes: [
      'One clothing budget covering the whole haul:',
      '8–10 T-shirts',
      '2 jeans',
      '2–3 trousers / joggers',
      '2 shorts',
      '2 polos',
      '2 button-up shirts',
      '1 hoodie / sweatshirt',
      'Socks',
      'Underwear',
      'Split individual pieces out as their own products if you want to track them separately.',
    ].join('\n'),
  },

  // ------------------------------------------------------------------- Perfume
  {
    id: 'seed-afnan-9pm',
    name: 'Afnan 9 PM',
    category: 'Perfume',
    brand: 'Afnan',
    imageKey: 'perfume-afnan-9pm',
    quantity: 1,
    estimatedPrice: 90,
    targetPrice: 90,
    targetMin: 75,
    targetMax: 110,
  },
  {
    id: 'seed-lattafa-khamrah',
    name: 'Lattafa Khamrah',
    category: 'Perfume',
    brand: 'Lattafa',
    imageKey: 'perfume-khamrah',
    quantity: 1,
    estimatedPrice: 100,
    targetPrice: 100,
    targetMin: 80,
    targetMax: 120,
  },
  {
    id: 'seed-club-de-nuit',
    name: 'Armaf Club de Nuit Intense Man EDP',
    category: 'Perfume',
    brand: 'Armaf',
    imageKey: 'perfume-club-de-nuit',
    quantity: 1,
    estimatedPrice: 105,
    targetPrice: 105,
    targetMin: 90,
    targetMax: 120,
    notes: 'EDP version specifically — not the EDT.',
  },
  {
    id: 'seed-lattafa-yara',
    name: 'Lattafa Yara',
    category: 'Perfume',
    brand: 'Lattafa',
    imageKey: 'perfume-yara',
    quantity: 1,
    estimatedPrice: 80,
    targetPrice: 80,
    targetMin: 60,
    targetMax: 100,
    notes: 'For sister.',
  },

  // -------------------------------------------------------------------- Watches
  {
    id: 'seed-casio-mtp',
    name: 'Casio MTP Analog Watch',
    category: 'Watches',
    brand: 'Casio',
    imageKey: 'casio-watch',
    quantity: 1,
    estimatedPrice: 150,
    targetPrice: 150,
    targetMin: 100,
    targetMax: 180,
    notes: 'Preferred: Casio MTP series, analog, stainless-steel bracelet, simple design.',
  },

  // ----------------------------------------------------------------------- Bags
  {
    id: 'seed-school-backpack',
    name: 'School Backpack',
    category: 'Bags',
    imageKey: 'backpack',
    quantity: 2,
    estimatedPrice: 67.5,
    targetPrice: 67.5,
    targetMin: 60,
    targetMax: 75,
    notes: 'Estimated total AED 135 for 2 (target total AED 120–150).',
  },
  {
    id: 'seed-laptop-bag',
    name: 'Laptop Bag',
    category: 'Bags',
    imageKey: 'laptop-bag',
    quantity: 1,
    estimatedPrice: 75,
    targetPrice: 75,
    targetMin: 50,
    targetMax: 100,
    notes: [
      'Requirements:',
      'Padded laptop compartment',
      'Thick bottom padding',
      'Water resistance',
      'Strong straps',
      'Accessory compartment',
    ].join('\n'),
  },

  // ---------------------------------------------------------------- Accessories
  {
    id: 'seed-sunglasses',
    name: 'Sunglasses',
    category: 'Accessories',
    imageKey: 'sunglasses',
    quantity: 1,
    estimatedPrice: 55,
    targetPrice: 55,
    targetMin: 50,
    targetMax: 60,
    notes: [
      'Requirements:',
      'UV400',
      '100% UVA / UVB protection',
      'Polarisation preferred',
      'Durable frame',
    ].join('\n'),
  },
  {
    id: 'seed-wallet',
    name: 'Wallet',
    category: 'Accessories',
    imageKey: 'wallet',
    quantity: 1,
    estimatedPrice: 50,
    targetPrice: 50,
    targetMin: 30,
    targetMax: 70,
  },
  {
    id: 'seed-belts',
    name: 'Belts',
    category: 'Accessories',
    imageKey: 'belts',
    quantity: 2,
    estimatedPrice: 45,
    targetPrice: 45,
    targetMin: 30,
    targetMax: 60,
    notes: 'Estimated total AED 90 for 2.\nPreferred: one black, one brown, strong buckle, durable material.',
  },

  // ----------------------------------------------------------------------- Room
  {
    id: 'seed-led-strips',
    name: 'LED Strips',
    category: 'Room',
    imageKey: 'led-strip',
    quantity: 1,
    estimatedPrice: 35,
    targetPrice: 35,
    targetMin: 30,
    targetMax: 40,
  },
  {
    id: 'seed-desk-lamp',
    name: 'LED Desk Lamp',
    category: 'Room',
    imageKey: 'desk-lamp',
    quantity: 1,
    estimatedPrice: 70,
    targetPrice: 70,
    targetMin: 60,
    targetMax: 80,
  },
  {
    id: 'seed-room-decor',
    name: 'Room Decoration / Antique',
    category: 'Room',
    imageKey: 'room-decor',
    quantity: 1,
    estimatedPrice: 150,
    targetPrice: 150,
    targetMin: 100,
    targetMax: 200,
    notes: 'Decorative, non-weapon items only.',
  },

  // ----------------------------------------------------------------- Skateboards
  {
    id: 'seed-skateboard',
    name: 'Skateboard',
    category: 'Skateboards',
    imageKey: 'skateboard',
    quantity: 2,
    estimatedPrice: 225,
    targetPrice: 225,
    targetMin: 200,
    targetMax: 250,
    notes: [
      'Estimated total AED 450 for 2 (target total AED 400–500).',
      'Prefer a complete skateboard, roughly 8–8.25 inch deck,',
      'solid trucks, good bearings, durable wheels.',
    ].join('\n'),
  },

  // ----------------------------------------------------------- Skincare & Hygiene
  {
    id: 'seed-skincare',
    name: 'Skincare & Hygiene',
    category: 'Skincare & Hygiene',
    imageKey: 'skincare',
    quantity: 1,
    estimatedPrice: 200,
    targetPrice: 200,
    targetMin: 150,
    targetMax: 250,
    notes: [
      'One combined budget. Possible products:',
      'Face cleanser, moisturiser, sunscreen,',
      'shampoo, conditioner, body wash,',
      'deodorant, lip balm, toothpaste,',
      'other everyday hygiene products.',
      'Split into individual products later if you want per-item tracking.',
    ].join('\n'),
  },

  // -------------------------------------------------------------- Water Bottles
  {
    id: 'seed-water-bottles',
    name: 'Water Bottles',
    category: 'Water Bottles',
    imageKey: 'water-bottle',
    quantity: 4,
    estimatedPrice: 22.5,
    targetPrice: 22.5,
    targetMin: 15,
    targetMax: 30,
    notes: [
      'Estimated total AED 90 for 3–4 bottles (target total AED 60–120).',
      'Requirements: leak-proof, durable, easy to clean,',
      'appropriate capacity, BPA-free where applicable.',
    ].join('\n'),
  },
]

/** Turns the seed definitions into full products ready for the store. */
export function createSeedProducts(now: Date = new Date()): Product[] {
  return SEED_PRODUCTS.map((seed, index) => {
    // Stagger timestamps so "recently added" keeps the planner's own order.
    const added = new Date(now.getTime() - (SEED_PRODUCTS.length - index) * 1000).toISOString()
    return {
      id: seed.id,
      name: seed.name,
      category: seed.category,
      brand: seed.brand,
      image: seed.imageKey ? { kind: 'builtin' as const, key: seed.imageKey } : null,
      quantity: seed.quantity,
      targetPrice: seed.targetPrice,
      targetMin: seed.targetMin ?? null,
      targetMax: seed.targetMax ?? null,
      estimatedPrice: seed.estimatedPrice,
      // Deliberately empty: no price is "current" until it has been seen in a store.
      currentPrice: null,
      actualPrice: null,
      currency: DEFAULT_CURRENCY,
      purchased: false,
      purchasedAt: null,
      notes: seed.notes,
      store: seed.store,
      productUrl: seed.productUrl,
      dateAdded: added,
      lastUpdated: added,
      isCustom: false,
      priceHistory: [],
      alternativeToId: null,
    }
  })
}
