import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useSearch } from 'wouter';
import { BottomNav } from '@/components/bottom-nav';
import { ProductCard, ProductCardSkeleton } from '@/components/product-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useMCP } from '@/hooks/use-mcp';
import { parseMCPProductResponse } from '@/lib/mcp-parser';
import { cacheProducts } from '@/lib/product-cache';
import type { Product } from '@shared/schema';
import { ArrowLeft, Search, X, SlidersHorizontal, ChevronDown, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const INITIAL_PRODUCTS = 12;
const LOAD_MORE_COUNT = 12;
const MAX_PRODUCTS_PER_REQUEST = 50;

const sortOptions = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'price_low', label: 'Price: Low to High' },
  { value: 'price_high', label: 'Price: High to Low' },
  { value: 'rating', label: 'Rating' },
];

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [displayedProducts, setDisplayedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sortBy, setSortBy] = useState('relevance');
  const [hasSearched, setHasSearched] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [, setLocation] = useLocation();
  const searchParams = useSearch();
  const { invoke } = useMCP();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    const q = params.get('q');
    if (q) {
      setQuery(q);
      performSearch(q);
    } else {
      searchInputRef.current?.focus();
    }
  }, [searchParams]);

  const performSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    setHasSearched(true);
    
    try {
      // Fetch multiple pages to get more products
      let allFetchedProducts: Product[] = [];
      
      const result = await invoke<unknown>('get_products', {
        query: searchQuery,
        limit: MAX_PRODUCTS_PER_REQUEST,
      });
      allFetchedProducts = parseMCPProductResponse(result);

      cacheProducts(allFetchedProducts);
      setAllProducts(allFetchedProducts);
      setDisplayedProducts(allFetchedProducts.slice(0, INITIAL_PRODUCTS));
      setHasMore(allFetchedProducts.length > INITIAL_PRODUCTS);
    } catch (err) {
      console.error('Search failed:', err);
      setAllProducts([]);
      setDisplayedProducts([]);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    
    setLoadingMore(true);
    
    setTimeout(() => {
      const currentCount = displayedProducts.length;
      const sortedAll = getSortedProducts(allProducts);
      const nextProducts = sortedAll.slice(0, currentCount + LOAD_MORE_COUNT);
      setDisplayedProducts(nextProducts);
      setHasMore(nextProducts.length < sortedAll.length);
      setLoadingMore(false);
    }, 300);
  }, [displayedProducts, allProducts, hasMore, loadingMore, sortBy]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [loadMore, hasMore, loadingMore]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      setLocation(`/search?q=${encodeURIComponent(query.trim())}`);
      performSearch(query.trim());
    }
  };

  const handleClear = () => {
    setQuery('');
    setAllProducts([]);
    setDisplayedProducts([]);
    setHasSearched(false);
    setHasMore(false);
    searchInputRef.current?.focus();
  };

  const getSortedProducts = (products: Product[]) => {
    return [...products].sort((a, b) => {
      const priceA = a.price?.effective?.min || a.effectivePrice || 0;
      const priceB = b.price?.effective?.min || b.effectivePrice || 0;
      
      switch (sortBy) {
        case 'price_low':
          return priceA - priceB;
        case 'price_high':
          return priceB - priceA;
        case 'rating':
          return (b.rating || 0) - (a.rating || 0);
        default:
          return 0;
      }
    });
  };

  useEffect(() => {
    if (allProducts.length > 0) {
      const sortedAll = getSortedProducts(allProducts);
      setDisplayedProducts(sortedAll.slice(0, displayedProducts.length || INITIAL_PRODUCTS));
    }
  }, [sortBy]);

  const sortedDisplayed = getSortedProducts(displayedProducts);

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 bg-background/95 backdrop-blur-sm z-40 px-4 py-3 border-b border-border">
        <form onSubmit={handleSearch} className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setLocation('/home')}
            data-testid="button-back-search"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for products..."
              className="pl-10 pr-10 h-10"
              data-testid="input-search"
            />
            {query && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                onClick={handleClear}
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </form>
      </header>

      {hasSearched && allProducts.length > 0 && (
        <div className="px-4 py-3 flex items-center justify-between gap-4 border-b border-border bg-muted/30">
          <span className="text-sm text-muted-foreground">
            {allProducts.length} product{allProducts.length !== 1 ? 's' : ''}
          </span>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1">
                <SlidersHorizontal className="w-4 h-4" />
                {sortOptions.find((o) => o.value === sortBy)?.label}
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {sortOptions.map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  onClick={() => setSortBy(option.value)}
                  className={cn(sortBy === option.value && 'bg-accent')}
                >
                  {option.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      <div className="p-4">
        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : sortedDisplayed.length > 0 ? (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {sortedDisplayed.map((product) => (
                <ProductCard key={product.slug} product={product} />
              ))}
            </div>
            
            {hasMore && (
              <div ref={loadMoreRef} className="py-8 flex justify-center">
                {loadingMore ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Loading more...</span>
                  </div>
                ) : (
                  <Button variant="outline" onClick={loadMore}>
                    Load More
                  </Button>
                )}
              </div>
            )}
            
            {!hasMore && displayedProducts.length > INITIAL_PRODUCTS && (
              <p className="text-center text-sm text-muted-foreground py-6">
                Showing all {allProducts.length} products
              </p>
            )}
          </>
        ) : hasSearched ? (
          <div className="text-center py-16">
            <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">No products found for "{query}"</p>
            <Button variant="outline" onClick={handleClear}>
              Clear Search
            </Button>
          </div>
        ) : (
          <div className="text-center py-16">
            <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-2">Search for beauty products</p>
            <p className="text-sm text-muted-foreground">
              Try "lipstick", "serum", or "perfume"
            </p>
          </div>
        )}
      </div>

      <BottomNav active="search" />
    </div>
  );
}
