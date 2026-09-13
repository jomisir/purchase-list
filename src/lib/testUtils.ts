import type { PriceRecord, Product } from '@/types'

let counter = 0

export function makeProduct(overrides: Partial<Product> = {}): Product {
  counter += 1
  const timestamp = `2026-09-${String((counter % 28) + 1).padStart(2, '0')}T10:00:00.000Z`
  return {
    id: `product-${counter}`,
    listId: 'list-test',
    name: `Product ${counter}`,
    category: 'Electronics',
    image: null,
    quantity: 1,
    targetPrice: 100,
    targetMin: null,
    targetMax: null,
    estimatedPrice: 100,
    currentPrice: null,
    actualPrice: null,
    currency: 'AED',
    purchased: false,
    purchasedAt: null,
    dateAdded: timestamp,
    lastUpdated: timestamp,
    isCustom: false,
    priceHistory: [],
    alternativeToId: null,
    ...overrides,
  }
}

export function makeRecord(overrides: Partial<PriceRecord> = {}): PriceRecord {
  counter += 1
  return {
    id: `price-${counter}`,
    productId: 'product-1',
    price: 100,
    currency: 'AED',
    date: '2026-09-10',
    source: 'manual',
    ...overrides,
  }
}
