import { useLocation } from 'wouter';
import { BottomNav } from '@/components/bottom-nav';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';
import { 
  User, 
  CreditCard, 
  MapPin, 
  Bell, 
  LogOut, 
  ChevronRight,
  Phone,
  Settings,
  HelpCircle,
  Shield
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MenuItemProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description?: string;
  onClick: () => void;
  danger?: boolean;
}

function MenuItem({ icon: Icon, label, description, onClick, danger }: MenuItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-4 p-4 hover-elevate rounded-xl transition-colors text-left',
        danger && 'text-destructive'
      )}
      data-testid={`menu-${label.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <div className={cn(
        'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0',
        danger ? 'bg-destructive/10' : 'bg-muted'
      )}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium">{label}</p>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {!danger && <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />}
    </button>
  );
}

export default function AccountPage() {
  const [, setLocation] = useLocation();
  const { user, phone, logout } = useAppStore();
  const { toast } = useToast();

  const handleLogout = () => {
    logout();
    toast({
      title: 'Logged out',
      description: 'You have been logged out successfully',
    });
    setLocation('/login');
  };

  const formatPhone = (p: string | null) => {
    if (!p) return '';
    return `+91 ${p.slice(0, 5)} ${p.slice(5)}`;
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 bg-background/95 backdrop-blur-sm z-40 px-4 py-4 border-b border-border">
        <h1 className="text-xl font-bold">My Account</h1>
      </header>

      <div className="p-4 space-y-4">
        <Card className="p-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <User className="w-8 h-8 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-lg">{user?.name || 'TIRA User'}</p>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="w-4 h-4" />
                <span className="text-sm">{formatPhone(phone)}</span>
              </div>
              {user?.email && (
                <p className="text-sm text-muted-foreground truncate">{user.email}</p>
              )}
            </div>
          </div>
        </Card>

        <Card className="overflow-hidden">
          <MenuItem
            icon={CreditCard}
            label="Payment Methods"
            description="Reserve Pay & UPI"
            onClick={() => setLocation('/account/payment-methods')}
          />
          <div className="border-t border-border" />
          <MenuItem
            icon={MapPin}
            label="Saved Addresses"
            description="Manage delivery addresses"
            onClick={() => setLocation('/account/addresses')}
          />
        </Card>

        <Card className="overflow-hidden">
          <MenuItem
            icon={Bell}
            label="Notifications"
            description="Manage alerts & updates"
            onClick={() => {
              toast({
                title: 'Coming soon',
                description: 'Notification settings will be available soon',
              });
            }}
          />
          <div className="border-t border-border" />
          <MenuItem
            icon={Settings}
            label="Settings"
            onClick={() => {
              toast({
                title: 'Coming soon',
                description: 'Settings will be available soon',
              });
            }}
          />
          <div className="border-t border-border" />
          <MenuItem
            icon={HelpCircle}
            label="Help & Support"
            onClick={() => {
              toast({
                title: 'Coming soon',
                description: 'Help section will be available soon',
              });
            }}
          />
        </Card>

        <Card className="overflow-hidden">
          <MenuItem
            icon={Shield}
            label="Admin Panel"
            description="Demo controls"
            onClick={() => setLocation('/admin')}
          />
        </Card>

        <Card className="overflow-hidden">
          <MenuItem
            icon={LogOut}
            label="Logout"
            onClick={handleLogout}
            danger
          />
        </Card>

        <p className="text-center text-xs text-muted-foreground pt-4">
          Powered by Razorpay Reserve Pay
        </p>
      </div>

      <BottomNav active="account" />
    </div>
  );
}
