import { useState, useEffect, useRef } from 'react';
import { useLocation, useSearch } from 'wouter';
import { BottomNav } from '@/components/bottom-nav';
import { ProductCard, ProductCardSkeleton } from '@/components/product-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useMCP } from '@/hooks/use-mcp';
import type { Product } from '@shared/schema';
import { ArrowLeft, Search, X, SlidersHorizontal, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const sortOptions = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'price_low', label: 'Price: Low to High' },
  { value: 'price_high', label: 'Price: High to Low' },
  { value: 'rating', label: 'Rating' },
];

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState('relevance');
  const [hasSearched, setHasSearched] = useState(false);
  const [, setLocation] = useLocation();
  const searchParams = useSearch();
  const { invoke } = useMCP();
  const searchInputRef = useRef<HTMLInputElement>(null);

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
      const result = await invoke<{ products?: Array<Record<string, unknown>> }>('get_products', {
        query: searchQuery,
        limit: 20,
      });

      const mappedProducts: Product[] = (result.products || []).map((p: Record<string, unknown>) => ({
        id: String(p.uid || p.id || ''),
        uid: p.uid as number,
        slug: p.slug as string,
        name: p.name as string,
        brand: p.brand as { name: string } | undefined,
        brandName: (p.brand as { name?: string })?.name,
        images: p.images as Array<{ url: string }> | undefined,
        medias: p.medias as Array<{ url: string }> | undefined,
        price: p.price as { effective?: { min: number }; marked?: { min: number } } | undefined,
        discount: p.discount as string | undefined,
        rating: p.rating as number | undefined,
        ratingCount: p.ratingCount as number | undefined,
        itemId: (p as { item_id?: number }).item_id,
        articleId: (p as { article_id?: string }).article_id,
      }));

      setProducts(mappedProducts);
    } catch (err) {
      console.error('Search failed:', err);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      setLocation(`/search?q=${encodeURIComponent(query.trim())}`);
      performSearch(query.trim());
    }
  };

  const handleClear = () => {
    setQuery('');
    setProducts([]);
    setHasSearched(false);
    searchInputRef.current?.focus();
  };

  const sortedProducts = [...products].sort((a, b) => {
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

      {hasSearched && products.length > 0 && (
        <div className="px-4 py-3 flex items-center justify-between gap-4 border-b border-border bg-muted/30">
          <span className="text-sm text-muted-foreground">
            {products.length} result{products.length !== 1 ? 's' : ''}
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
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : sortedProducts.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {sortedProducts.map((product) => (
              <ProductCard key={product.slug} product={product} />
            ))}
          </div>
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
