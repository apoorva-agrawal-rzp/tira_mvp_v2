import { useLocation } from 'wouter';
import { Home, Heart, Package, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { id: 'home', icon: Home, label: 'Home', path: '/home' },
  { id: 'wishlist', icon: Heart, label: 'Wishlist', path: '/wishlist' },
  { id: 'orders', icon: Package, label: 'Orders', path: '/orders' },
  { id: 'account', icon: User, label: 'Account', path: '/account' },
];

interface BottomNavProps {
  active?: string;
}

export function BottomNav({ active }: BottomNavProps) {
  const [, setLocation] = useLocation();

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 bg-background border-t border-border flex justify-around py-2 z-50 safe-area-bottom"
      data-testid="bottom-navigation"
    >
      {navItems.map((item) => {
        const isActive = active === item.id;
        const Icon = item.icon;
        
        return (
          <button
            key={item.id}
            onClick={() => setLocation(item.path)}
            className={cn(
              'flex flex-col items-center py-1 px-3 min-w-[64px] transition-colors',
              isActive ? 'text-primary' : 'text-muted-foreground'
            )}
            data-testid={`nav-${item.id}`}
          >
            <Icon 
              className={cn(
                'w-6 h-6 mb-0.5',
                isActive && 'fill-primary/20'
              )} 
            />
            <span className="text-xs font-medium">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
