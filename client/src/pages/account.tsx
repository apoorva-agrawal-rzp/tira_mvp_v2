import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { BottomNav } from '@/components/bottom-nav';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/lib/store';
import { useMCP } from '@/hooks/use-mcp';
import { useToast } from '@/hooks/use-toast';
import { 
  User, 
  CreditCard, 
  MapPin, 
  Bell, 
  LogOut, 
  ChevronRight,
  Phone,
  Mail,
  Settings,
  HelpCircle,
  Shield,
  ShoppingCart
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
  const [loading, setLoading] = useState(false);
  const { user, phone, session, setUser, logout } = useAppStore();
  const { invoke } = useMCP();
  const { toast } = useToast();

  useEffect(() => {
    if (session && phone) {
      fetchUserDetails();
    }
  }, [session, phone]);

  const fetchUserDetails = async () => {
    if (!session || !phone) return;
    
    setLoading(true);
    try {
      const result = await invoke<{
        user?: {
          first_name?: string;
          last_name?: string;
          emails?: Array<{ email?: string }>;
          email?: string;
          phone?: string;
        };
        response?: {
          user?: {
            first_name?: string;
            last_name?: string;
            emails?: Array<{ email?: string }>;
            email?: string;
          };
        };
        user_details?: {
          first_name?: string;
          last_name?: string;
          emails?: Array<{ email?: string }>;
          email?: string;
        };
        is_authenticated?: boolean;
        authenticated?: boolean;
        first_name?: string;
        last_name?: string;
        email?: string;
      }>('check_user_session', {
        cookies: session,
      });

      // Handle nested response structure: result.response.user or result.user_details or result.user
      const userInfo = result.response?.user || result.user_details || result.user;
      const firstName = userInfo?.first_name || result.first_name || '';
      const lastName = userInfo?.last_name || result.last_name || '';
      // Email might be in emails array or direct email field
      const emails = userInfo?.emails;
      const emailFromArray = emails && emails.length > 0 ? emails[0].email : undefined;
      const email = emailFromArray || userInfo?.email || result.email || user?.email || '';
      const fullName = lastName ? `${firstName} ${lastName}` : firstName;

      if (fullName || email) {
        setUser({
          phone: phone || '',
          name: fullName || user?.name || '',
          email: email,
        });
      }
    } catch (err) {
      console.error('Failed to fetch user details:', err);
    } finally {
      setLoading(false);
    }
  };

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
        <Card className="p-4" data-testid="card-user-profile">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <User className="w-8 h-8 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-lg" data-testid="text-user-name">
                {user?.name || 'TIRA User'}
              </p>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="w-4 h-4" />
                <span className="text-sm" data-testid="text-user-phone">{formatPhone(phone)}</span>
              </div>
              {user?.email && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="w-4 h-4" />
                  <span className="text-sm truncate" data-testid="text-user-email">{user.email}</span>
                </div>
              )}
            </div>
          </div>
        </Card>

        <Card className="overflow-hidden">
          <MenuItem
            icon={ShoppingCart}
            label="My Cart"
            description="View & manage cart items"
            onClick={() => setLocation('/account/cart')}
          />
          <div className="border-t border-border" />
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
