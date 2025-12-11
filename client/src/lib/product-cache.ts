import type { Product } from '@shared/schema';

const CACHE_KEY = 'tira-product-cache';
const MAX_CACHE_SIZE = 100;
const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

interface CachedProduct {
  product: Product;
  timestamp: number;
}

interface ProductCache {
  [slug: string]: CachedProduct;
}

// Guard for SSR/test environments where localStorage is not available
function isLocalStorageAvailable(): boolean {
  try {
    if (typeof window === 'undefined') return false;
    const testKey = '__cache_test__';
    localStorage.setItem(testKey, testKey);
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

function getCache(): ProductCache {
  if (!isLocalStorageAvailable()) return {};
  
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return {};
    const parsed = JSON.parse(cached) as ProductCache;
    
    // Clean expired entries
    const now = Date.now();
    const cleaned: ProductCache = {};
    for (const [slug, entry] of Object.entries(parsed)) {
      if (now - entry.timestamp < CACHE_EXPIRY_MS) {
        cleaned[slug] = entry;
      }
    }
    return cleaned;
  } catch {
    return {};
  }
}

function setCache(cache: ProductCache) {
  if (!isLocalStorageAvailable()) return;
  
  try {
    // Limit cache size
    const entries = Object.entries(cache);
    if (entries.length > MAX_CACHE_SIZE) {
      const sorted = entries.sort((a, b) => b[1].timestamp - a[1].timestamp);
      cache = Object.fromEntries(sorted.slice(0, MAX_CACHE_SIZE));
    }
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch (e) {
    console.error('Failed to set product cache:', e);
  }
}

export function cacheProduct(product: Product): void {
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

export function cacheProducts(products: Product[]): void {
  if (!products.length) return;
  const cache = getCache();
  const now = Date.now();
  for (const product of products) {
    if (product.slug) {
      cache[product.slug] = {
        product,
        timestamp: now,
      };
    }
  }
  setCache(cache);
}

export function getProductImage(slug: string): string | null {
  const product = getCachedProduct(slug);
  if (product?.images?.[0]?.url) {
    return product.images[0].url;
  }
  return null;
}

export function clearProductCache(): void {
  if (!isLocalStorageAvailable()) return;
  
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {
    // Ignore errors
  }
}
