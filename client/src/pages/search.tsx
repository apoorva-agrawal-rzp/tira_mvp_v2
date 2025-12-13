import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useSearch } from 'wouter';
import { BottomNav } from '@/components/bottom-nav';
import { ProductCard, ProductCardSkeleton } from '@/components/product-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useMCP } from '@/hooks/use-mcp';
import { parseMCPProductResponse } from '@/lib/mcp-parser';
import { cacheProducts } from '@/lib/product-cache';
import type { Product } from '@shared/schema';
import { ArrowLeft, Search, X, SlidersHorizontal, ChevronDown, Loader2, Sparkles, TrendingUp, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

const INITIAL_PRODUCTS = 12;
const LOAD_MORE_COUNT = 12;
const MAX_PRODUCTS_PER_REQUEST = 50;

const sortOptions = [
  { value: 'relevance', label: 'Relevance', icon: TrendingUp },
  { value: 'price_low', label: 'Price: Low to High', icon: Package },
  { value: 'price_high', label: 'Price: High to Low', icon: Package },
  { value: 'rating', label: 'Rating', icon: Sparkles },
];

const quickSearches = [
  'Lakme Lipstick',
  'Serum',
  'Perfume',
  'Foundation',
  'Mascara',
  'Nail Polish',
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
      const result = await invoke<unknown>('get_products', {
        query: searchQuery,
        limit: MAX_PRODUCTS_PER_REQUEST,
      });
      const allFetchedProducts = parseMCPProductResponse(result);

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

  const handleQuickSearch = (term: string) => {
    setQuery(term);
    setLocation(`/search?q=${encodeURIComponent(term)}`);
    performSearch(term);
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
  const currentSortOption = sortOptions.find((o) => o.value === sortBy);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex flex-col">
      {/* Premium Header */}
      <header className="sticky top-0 left-0 right-0 bg-background/80 backdrop-blur-xl z-50 border-b border-border/50 shadow-sm">
        <div className="px-4 py-4">
          <form onSubmit={handleSearch} className="flex items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setLocation('/home')}
              data-testid="button-back-search"
              className="rounded-full hover:bg-primary/10 flex-shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            
            <div className="flex-1 relative">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-purple-500/20 rounded-2xl opacity-0 focus-within:opacity-100 blur transition-opacity pointer-events-none" />
              <div className="relative">
                <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none z-10" />
                <Input
                  ref={searchInputRef}
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search for products..."
                  className="pl-12 pr-12 h-12 rounded-2xl border-2 bg-background/50 backdrop-blur-sm focus-visible:border-primary transition-all w-full"
                  data-testid="input-search"
                />
                {query && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full hover:bg-destructive/10 z-10"
                    onClick={handleClear}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          </form>
        </div>
      </header>

      {/* Results Header with Sort */}
      {hasSearched && allProducts.length > 0 && (
        <div className="px-4 py-4 flex items-center justify-between gap-4 bg-gradient-to-r from-primary/5 to-purple/5 border-b border-border">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="font-semibold">
              {allProducts.length} Results
            </Badge>
            {query && (
              <span className="text-sm text-muted-foreground">
                for "{query}"
              </span>
            )}
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 rounded-xl">
                <SlidersHorizontal className="w-4 h-4" />
                <span className="hidden sm:inline">{currentSortOption?.label || 'Sort'}</span>
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Sort By</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {sortOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <DropdownMenuItem
                    key={option.value}
                    onClick={() => setSortBy(option.value)}
                    className={cn(
                      'gap-2 cursor-pointer',
                      sortBy === option.value && 'bg-primary/10 text-primary'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {option.label}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      <div className="p-4 flex-1 pb-20">
        {/* Quick Searches - Empty State */}
        {!hasSearched && (
          <div className="space-y-6 max-w-2xl mx-auto">
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Quick Searches
              </h3>
              <div className="flex flex-wrap gap-2">
                {quickSearches.map((term) => (
                  <Button
                    key={term}
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickSearch(term)}
                    className="rounded-full hover:bg-primary hover:text-white transition-all hover:scale-105"
                  >
                    {term}
                  </Button>
                ))}
              </div>
            </div>

            <div className="text-center py-12">
              <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-primary/10 to-purple/10 flex items-center justify-center mx-auto mb-4">
                <Search className="w-12 h-12 text-primary" />
              </div>
              <h3 className="font-bold text-xl mb-2">Search for Beauty Products</h3>
              <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                Find your favorite makeup, skincare, fragrance & more from top brands
              </p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          </div>
        )}

        {/* Results Grid */}
        {!loading && sortedDisplayed.length > 0 && (
          <>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {sortedDisplayed.map((product) => (
                <ProductCard key={product.slug} product={product} />
              ))}
            </div>
            
            {/* Load More */}
            {hasMore && (
              <div ref={loadMoreRef} className="py-8 flex justify-center">
                {loadingMore ? (
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="font-medium">Loading more...</span>
                  </div>
                ) : (
                  <Button 
                    variant="outline" 
                    onClick={loadMore}
                    size="lg"
                    className="rounded-full gap-2"
                  >
                    Load More Products
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                )}
              </div>
            )}
            
            {!hasMore && displayedProducts.length > INITIAL_PRODUCTS && (
              <div className="text-center py-8">
                <Badge variant="secondary" className="text-sm">
                  Showing all {allProducts.length} products
                </Badge>
              </div>
            )}
          </>
        )}

        {/* No Results */}
        {!loading && hasSearched && sortedDisplayed.length === 0 && (
          <div className="text-center py-16 max-w-md mx-auto">
            <div className="w-24 h-24 rounded-3xl bg-muted flex items-center justify-center mx-auto mb-6">
              <Search className="w-12 h-12 text-muted-foreground" />
            </div>
            <h3 className="font-bold text-xl mb-2">No Products Found</h3>
            <p className="text-muted-foreground mb-6">
              We couldn't find any results for "<span className="font-medium">{query}</span>"
            </p>
            <div className="space-y-3">
              <Button variant="default" onClick={handleClear} size="lg" className="w-full rounded-xl">
                Clear Search
              </Button>
              <p className="text-sm text-muted-foreground">Try searching for:</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {quickSearches.slice(0, 3).map((term) => (
                  <Button
                    key={term}
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickSearch(term)}
                    className="rounded-full"
                  >
                    {term}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <BottomNav active="search" />
    </div>
  );
}
