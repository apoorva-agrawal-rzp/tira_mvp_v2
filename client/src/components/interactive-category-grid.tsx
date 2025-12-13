import { useState, useCallback, useRef, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useMCP } from '@/hooks/use-mcp';
import { parseMCPProductResponse } from '@/lib/mcp-parser';
import { ProductImage } from '@/components/product-image';
import { Sparkles, Scissors, Droplets, Bath, Palette, ShoppingBag, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Product } from '@shared/schema';

interface Category {
  id: string;
  name: string;
  icon: typeof Palette;
  query: string;
  color: string;
  hoverColor: string;
}

const categories: Category[] = [
  { id: 'makeup', name: 'Makeup', icon: Palette, query: 'makeup lipstick foundation', color: 'bg-pink-100 dark:bg-pink-900/30', hoverColor: 'hover:bg-pink-200 dark:hover:bg-pink-800/40' },
  { id: 'skincare', name: 'Skincare', icon: Sparkles, query: 'skincare serum cream', color: 'bg-purple-100 dark:bg-purple-900/30', hoverColor: 'hover:bg-purple-200 dark:hover:bg-purple-800/40' },
  { id: 'hair', name: 'Hair Care', icon: Scissors, query: 'shampoo hair conditioner', color: 'bg-blue-100 dark:bg-blue-900/30', hoverColor: 'hover:bg-blue-200 dark:hover:bg-blue-800/40' },
  { id: 'fragrance', name: 'Fragrance', icon: Droplets, query: 'perfume fragrance cologne', color: 'bg-amber-100 dark:bg-amber-900/30', hoverColor: 'hover:bg-amber-200 dark:hover:bg-amber-800/40' },
  { id: 'bath', name: 'Bath & Body', icon: Bath, query: 'body lotion shower gel', color: 'bg-teal-100 dark:bg-teal-900/30', hoverColor: 'hover:bg-teal-200 dark:hover:bg-teal-800/40' },
  { id: 'tools', name: 'Tools', icon: ShoppingBag, query: 'beauty tools brush sponge', color: 'bg-rose-100 dark:bg-rose-900/30', hoverColor: 'hover:bg-rose-200 dark:hover:bg-rose-800/40' },
];

interface CategoryPreviewProps {
  products: Product[];
  loading: boolean;
  categoryName: string;
}

function CategoryPreview({ products, loading, categoryName }: CategoryPreviewProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="ml-2 text-sm text-muted-foreground">Loading {categoryName}...</span>
      </div>
    );
  }

  if (products.length === 0) {
    return null;
  }

  return (
    <div className="py-4 animate-in fade-in slide-in-from-top-2 duration-300">
      <p className="text-sm text-muted-foreground mb-3">Quick preview from {categoryName}</p>
      <div className="grid grid-cols-4 gap-3">
        {products.slice(0, 4).map((product) => (
          <div key={product.slug} className="group">
            <div className="aspect-square rounded-xl overflow-hidden bg-muted mb-2">
              <ProductImage
                src={product.images?.[0]?.url}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </div>
            <p className="text-xs font-medium line-clamp-2 leading-tight">{product.name}</p>
            <p className="text-xs text-primary font-semibold mt-0.5">
              ₹{(product.effectivePrice || product.price?.effective?.min || 0).toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function InteractiveCategoryGrid() {
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const [previewProducts, setPreviewProducts] = useState<Product[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [, setLocation] = useLocation();
  const { invoke } = useMCP();
  const abortControllerRef = useRef<AbortController | null>(null);
  const cacheRef = useRef<Record<string, Product[]>>({});

  const fetchCategoryProducts = useCallback(async (categoryId: string, query: string) => {
    if (cacheRef.current[categoryId]) {
      setPreviewProducts(cacheRef.current[categoryId]);
      return;
    }

    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    setLoadingPreview(true);
    try {
      const result = await invoke<unknown>('get_products', {
        query,
        limit: 8,
      });

      const products = parseMCPProductResponse(result);
      cacheRef.current[categoryId] = products;
      setPreviewProducts(products);
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.error('Failed to fetch category products:', err);
      }
    } finally {
      setLoadingPreview(false);
    }
  }, [invoke]);

  const handleCategoryHover = (category: Category) => {
    setHoveredCategory(category.id);
    fetchCategoryProducts(category.id, category.query);
  };

  const handleCategoryLeave = () => {
    setHoveredCategory(null);
    setPreviewProducts([]);
    setLoadingPreview(false);
  };

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const hoveredCategoryData = categories.find((c) => c.id === hoveredCategory);

  return (
    <div data-testid="interactive-category-grid">
      <h3 className="font-bold text-lg mb-4">Shop by Category</h3>
      
      <div 
        className="grid grid-cols-3 gap-3"
        onMouseLeave={handleCategoryLeave}
      >
        {categories.map((cat) => {
          const Icon = cat.icon;
          const isHovered = hoveredCategory === cat.id;
          
          return (
            <button
              key={cat.id}
              onClick={() => setLocation(`/search?q=${encodeURIComponent(cat.query)}`)}
              onMouseEnter={() => handleCategoryHover(cat)}
              onFocus={() => handleCategoryHover(cat)}
              onBlur={handleCategoryLeave}
              className={cn(
                'rounded-xl p-4 text-center transition-all duration-200 hover-elevate active-elevate-2',
                cat.color,
                isHovered && 'ring-2 ring-primary ring-offset-2 ring-offset-background'
              )}
              data-testid={`category-${cat.id}`}
            >
              <div className="w-12 h-12 rounded-full bg-background/60 dark:bg-background/30 flex items-center justify-center mx-auto mb-2">
                <Icon className="w-6 h-6 text-foreground" />
              </div>
              <span className="text-sm font-medium">{cat.name}</span>
            </button>
          );
        })}
      </div>

      {hoveredCategory && (
        <CategoryPreview
          products={previewProducts}
          loading={loadingPreview}
          categoryName={hoveredCategoryData?.name || ''}
        />
      )}
    </div>
  );
}
