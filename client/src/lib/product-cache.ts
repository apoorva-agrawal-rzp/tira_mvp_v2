import type { Product } from '@shared/schema';

const CACHE_KEY = 'tira-product-cache';
const MAX_CACHE_SIZE = 50;

interface ProductCache {
  [slug: string]: {
    product: Product;
    timestamp: number;
  };
}

function getCache(): ProductCache {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    return cached ? JSON.parse(cached) : {};
  } catch {
    return {};
  }
}

function setCache(cache: ProductCache) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // localStorage full, clear oldest items
    const entries = Object.entries(cache);
    if (entries.length > MAX_CACHE_SIZE) {
      const sorted = entries.sort((a, b) => b[1].timestamp - a[1].timestamp);
      const reduced = Object.fromEntries(sorted.slice(0, MAX_CACHE_SIZE / 2));
      localStorage.setItem(CACHE_KEY, JSON.stringify(reduced));
    }
  }
}

export function cacheProduct(product: Product) {
  if (!product.slug) return;
  const cache = getCache();
  cache[product.slug] = {
    product,
    timestamp: Date.now(),
  };
  setCache(cache);
}

export function getCachedProduct(slug: string): Product | null {
  const cache = getCache();
  const entry = cache[slug];
  if (entry) {
    return entry.product;
  }
  return null;
}

export function cacheProducts(products: Product[]) {
  const cache = getCache();
  for (const product of products) {
    if (product.slug) {
      cache[product.slug] = {
        product,
        timestamp: Date.now(),
      };
    }
  }
  setCache(cache);
}
