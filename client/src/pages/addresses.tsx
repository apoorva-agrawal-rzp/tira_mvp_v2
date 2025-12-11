import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingScreen, LoadingSpinner } from '@/components/loading-screen';
import { useMCP } from '@/hooks/use-mcp';
import { useAppStore } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';
import type { Address } from '@shared/schema';
import { 
  ArrowLeft, 
  MapPin, 
  Plus, 
  CheckCircle2, 
  Home,
  Briefcase,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AddressFormData {
  address: string;
  area: string;
  city: string;
  state: string;
  pincode: string;
  addressType: 'home' | 'work' | 'other';
}

const initialFormData: AddressFormData = {
  address: '',
  area: '',
  city: '',
  state: '',
  pincode: '',
  addressType: 'home',
};

export default function AddressesPage() {
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<AddressFormData>(initialFormData);
  const [, setLocation] = useLocation();
  const { invoke } = useMCP();
  const { session, addresses, setAddresses, addAddress } = useAppStore();
  const { toast } = useToast();

  useEffect(() => {
    fetchAddresses();
  }, []);

  const fetchAddresses = async () => {
    if (!session) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const result = await invoke<{ addresses?: Array<Record<string, unknown>>; address?: Array<Record<string, unknown>> }>('get_address', {
        cookies: session,
      });

      const addressList = result.addresses || result.address || [];
      const mappedAddresses: Address[] = addressList.map((a: Record<string, unknown>) => ({
        id: (a.id || a._id || String(Date.now())) as string,
        uid: a.uid as number | undefined,
        name: a.name as string | undefined,
        phone: a.phone as string | undefined,
        address: a.address as string,
        area: a.area as string,
        city: a.city as string,
        state: a.state as string,
        pincode: (a.pincode || a.area_code) as string,
        isDefault: a.is_default_address as boolean | undefined,
        addressType: a.address_type as string | undefined,
      }));

      setAddresses(mappedAddresses);
    } catch (err) {
      console.error('Failed to fetch addresses:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.address || !formData.area || !formData.city || !formData.state || !formData.pincode) {
      toast({
        title: 'Missing fields',
        description: 'Please fill in all address fields',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      await invoke('add_address', {
        address: formData.address,
        area: formData.area,
        city: formData.city,
        state: formData.state,
        area_code: formData.pincode,
        pincode: formData.pincode,
        address_type: formData.addressType,
        cookies: session,
      });

      addAddress({
        id: String(Date.now()),
        address: formData.address,
        area: formData.area,
        city: formData.city,
        state: formData.state,
        pincode: formData.pincode,
        addressType: formData.addressType,
      });

      toast({
        title: 'Address added',
        description: 'Your new address has been saved',
      });

      setShowAddForm(false);
      setFormData(initialFormData);
      fetchAddresses();
    } catch (err) {
      console.error('Failed to add address:', err);
      toast({
        title: 'Failed to add address',
        description: 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getAddressIcon = (type?: string) => {
    switch (type) {
      case 'work':
        return Briefcase;
      default:
        return Home;
    }
  };

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-background pb-8">
      <header className="sticky top-0 bg-background/95 backdrop-blur-sm z-40 px-4 py-3 flex items-center justify-between border-b border-border">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation('/account')}
            data-testid="button-back-addresses"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-bold">Saved Addresses</h1>
        </div>
        
        {!showAddForm && (
          <Button
            size="sm"
            onClick={() => setShowAddForm(true)}
            data-testid="button-add-address"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add
          </Button>
        )}
      </header>

      <div className="p-4 space-y-4">
        {showAddForm && (
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">Add New Address</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setShowAddForm(false);
                  setFormData(initialFormData);
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex gap-2 mb-4">
                {(['home', 'work', 'other'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setFormData({ ...formData, addressType: type })}
                    className={cn(
                      'flex-1 py-2 px-3 rounded-lg border-2 text-sm font-medium capitalize transition-colors',
                      formData.addressType === type
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-border'
                    )}
                  >
                    {type}
                  </button>
                ))}
              </div>

              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Street Address</label>
                <Input
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="House/Flat No., Building Name"
                  data-testid="input-street"
                />
              </div>

              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Area/Locality</label>
                <Input
                  value={formData.area}
                  onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                  placeholder="Area, Sector, Colony"
                  data-testid="input-area"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">City</label>
                  <Input
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="City"
                    data-testid="input-city"
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Pincode</label>
                  <Input
                    value={formData.pincode}
                    onChange={(e) => setFormData({ ...formData, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                    placeholder="6-digit"
                    data-testid="input-pincode"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm text-muted-foreground mb-1 block">State</label>
                <Input
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  placeholder="State"
                  data-testid="input-state"
                />
              </div>

              <Button
                type="submit"
                className="w-full py-5"
                disabled={submitting}
                data-testid="button-save-address"
              >
                {submitting ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span className="ml-2">Saving...</span>
                  </>
                ) : (
                  'Save Address'
                )}
              </Button>
            </form>
          </Card>
        )}

        {addresses.length > 0 ? (
          <div className="space-y-3">
            {addresses.map((addr) => {
              const Icon = getAddressIcon(addr.addressType);
              
              return (
                <Card key={addr.id} className="p-4" data-testid={`address-card-${addr.id}`}>
                  <div className="flex gap-3">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                      <Icon className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium capitalize">{addr.addressType || 'Home'}</span>
                        {addr.isDefault && (
                          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                            Default
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {addr.address}, {addr.area}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {addr.city}, {addr.state} - {addr.pincode}
                      </p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : !showAddForm && (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <MapPin className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="font-semibold mb-2">No saved addresses</h3>
            <p className="text-muted-foreground mb-6 text-sm">
              Add your delivery address to speed up checkout
            </p>
            <Button onClick={() => setShowAddForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Address
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
