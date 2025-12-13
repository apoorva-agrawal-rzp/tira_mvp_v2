import { useState } from 'react';
import { useLocation } from 'wouter';
import { TiraLogoFull } from '@/components/tira-logo';
import { HeroBannerCarousel } from '@/components/hero-banner-carousel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useMCP } from '@/hooks/use-mcp';
import { useAppStore } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Phone } from 'lucide-react';

export default function LoginPage() {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [, setLocation] = useLocation();
  const { invoke } = useMCP();
  const { setOtpRequestId, setPhone: storePhone } = useAppStore();
  const { toast } = useToast();

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 10);
    setPhone(value);
  };

  const handleSendOTP = async () => {
    if (phone.length !== 10) {
      toast({
        title: 'Invalid number',
        description: 'Please enter a valid 10-digit mobile number',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const result = await invoke<{ request_id: string }>('tira_send_otp', {
        mobile: phone,
        country_code: '91',
      });

      setOtpRequestId(result.request_id);
      storePhone(phone);
      
      toast({
        title: 'OTP Sent',
        description: `We've sent a verification code to +91 ${phone}`,
      });
      
      setLocation('/verify-otp');
    } catch (err) {
      toast({
        title: 'Failed to send OTP',
        description: 'Please try again later',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && phone.length === 10) {
      handleSendOTP();
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="p-4">
        <HeroBannerCarousel compact />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <TiraLogoFull className="mb-6" />
        
        <h1 className="text-2xl font-bold mb-2 text-center">Welcome to TIRA</h1>
        <p className="text-muted-foreground mb-8 text-center">India's Beauty Destination</p>

        <div className="w-full max-w-sm">
          <div className="flex border-2 rounded-xl overflow-hidden mb-4 focus-within:border-primary transition-colors">
            <div className="bg-muted px-4 py-3 text-muted-foreground flex items-center gap-2">
              <Phone className="w-4 h-4" />
              <span className="font-medium">+91</span>
            </div>
            <Input
              type="tel"
              value={phone}
              onChange={handlePhoneChange}
              onKeyDown={handleKeyDown}
              placeholder="Enter mobile number"
              className="border-0 rounded-none focus-visible:ring-0 h-auto py-3"
              data-testid="input-phone"
              autoFocus
            />
          </div>

          <Button
            onClick={handleSendOTP}
            disabled={loading || phone.length !== 10}
            className="w-full py-6 text-base font-semibold"
            data-testid="button-send-otp"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              'SEND OTP'
            )}
          </Button>
        </div>
      </div>

      <p className="text-center text-muted-foreground text-xs p-4">
        By continuing, you agree to our Terms of Service & Privacy Policy
      </p>
    </div>
  );
}
