import { useLocation } from 'wouter';
import { cn } from '@/lib/utils';

const featuredBrands = [
  { name: "Colorbar", query: "Colorbar", tier: "hero" },
  { name: "MyGlamm", query: "MyGlamm", tier: "hero" },
  { name: "Lakme", query: "Lakme", tier: "hero" },
  { name: "SUGAR", query: "Sugar Cosmetics", tier: "hero" },
  { name: "PAC", query: "PAC", tier: "strong" },
  { name: "Plum", query: "Plum", tier: "strong" },
  { name: "Makeup Revolution", query: "Makeup Revolution", tier: "strong" },
  { name: "Swiss Beauty", query: "Swiss Beauty", tier: "strong" },
  { name: "M.A.C", query: "MAC", tier: "premium" },
  { name: "Clinique", query: "Clinique", tier: "premium" },
  { name: "Estee Lauder", query: "Estee Lauder", tier: "premium" },
  { name: "Mamaearth", query: "Mamaearth", tier: "premium" },
];

const tierColors: Record<string, string> = {
  hero: "bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300",
  strong: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300",
  premium: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300",
};

export function TopBrandsSection() {
  const [, setLocation] = useLocation();

  return (
    <section data-testid="top-brands-section">
      <h3 className="font-bold text-lg mb-4">Top Brands</h3>
      <div className="grid grid-cols-4 gap-2">
        {featuredBrands.map((brand) => (
          <button
            key={brand.name}
            onClick={() => setLocation(`/search?q=${encodeURIComponent(brand.query)}`)}
            className={cn(
              "rounded-xl p-3 text-center transition-all duration-200 hover-elevate active-elevate-2",
              tierColors[brand.tier]
            )}
            data-testid={`brand-${brand.name.toLowerCase().replace(/\s+/g, '-')}`}
          >
            <span className="text-xs font-semibold line-clamp-2">{brand.name}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
