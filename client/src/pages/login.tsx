import { useState } from 'react';
import { useLocation } from 'wouter';
import { TiraLogoFull } from '@/components/tira-logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useMCP } from '@/hooks/use-mcp';
import { useAppStore } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Phone, Key, X } from 'lucide-react';

export default function LoginPage() {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCookieInput, setShowCookieInput] = useState(false);
  const [cookieValue, setCookieValue] = useState('');
  const [tapCount, setTapCount] = useState(0);
  const [, setLocation] = useLocation();
  const { invoke } = useMCP();
  const { setOtpRequestId, setPhone: storePhone, setSession, setUser } = useAppStore();
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

  // Secret double tap handler for testing
  const handleLogoTap = () => {
    setTapCount((prev) => prev + 1);
    
    // Reset tap count after 500ms
    setTimeout(() => {
      setTapCount(0);
    }, 500);

    // Show cookie input on double tap
    if (tapCount === 1) {
      setShowCookieInput(true);
      toast({
        title: '🔓 Dev Mode Activated',
        description: 'Cookie login enabled for testing',
      });
    }
  };

  // Direct login with cookie
  const handleCookieLogin = async () => {
    if (!cookieValue.trim()) {
      toast({
        title: 'Cookie Required',
        description: 'Please enter a valid session cookie',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      // Normalize cookie format - add "f.session=" if not present
      let normalizedCookie = cookieValue.trim();
      if (!normalizedCookie.startsWith('f.session=')) {
        normalizedCookie = `f.session=${normalizedCookie}`;
      }

      console.log('[Cookie Login] Attempting login with cookie:', normalizedCookie.substring(0, 30) + '...');

      // Verify the cookie by checking user session
      const result = await invoke<{
        authenticated?: boolean;
        response?: {
          user?: {
            _id: string;
            first_name: string;
            last_name?: string;
            emails?: Array<{ email: string }>;
            phone_numbers?: Array<{ phone: string }>;
          };
        };
        user_details?: {
          _id: string;
          first_name: string;
          last_name?: string;
          emails?: Array<{ email: string }>;
          phone_numbers?: Array<{ phone: string }>;
        };
      }>('check_user_session', {
        cookies: normalizedCookie,
      });

      console.log('[Cookie Login] API Response:', { 
        authenticated: result.authenticated,
        hasUser: !!(result.response?.user || result.user_details)
      });

      // Extract user from response (can be in response.user or user_details)
      const user = result.response?.user || result.user_details;

      if (result.authenticated && user) {
        console.log('[Cookie Login] User authenticated:', user.first_name);
        
        // Store session and user data
        setSession(normalizedCookie);
        setUser({
          id: user._id,
          name: `${user.first_name} ${user.last_name || ''}`.trim(),
          email: user.emails?.[0]?.email,
          phone: user.phone_numbers?.[0]?.phone || '',
        });

        toast({
          title: '✅ Cookie Login Successful',
          description: `Welcome back, ${user.first_name}!`,
        });

        // Navigate to home
        setLocation('/home');
      } else {
        throw new Error('Invalid session');
      }
    } catch (err) {
      console.error('Cookie login error:', err);
      toast({
        title: 'Cookie Login Failed',
        description: err instanceof Error ? err.message : 'Invalid or expired session cookie',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col p-6 bg-background">
      <div className="flex-1 flex flex-col items-center justify-center">
        <div 
          onClick={handleLogoTap}
          className="cursor-pointer select-none mb-8 transition-transform active:scale-95"
        >
          <TiraLogoFull />
        </div>
        
        <h1 className="text-2xl font-bold mb-2 text-center">Welcome to TIRA</h1>
        <p className="text-muted-foreground mb-8 text-center">India's Beauty Destination</p>

        <div className="w-full max-w-sm space-y-4">
          {/* Secret Cookie Input - Only shown after double tap */}
          {showCookieInput && (
            <Card className="p-4 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 border-2 border-orange-200 dark:border-orange-800 relative animate-in slide-in-from-top duration-300">
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 h-6 w-6 rounded-full"
                onClick={() => setShowCookieInput(false)}
              >
                <X className="w-3 h-3" />
              </Button>
              
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center">
                  <Key className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-sm">🔓 Dev Mode</p>
                  <p className="text-xs text-muted-foreground">Quick cookie login</p>
                </div>
              </div>

              <Input
                type="text"
                value={cookieValue}
                onChange={(e) => setCookieValue(e.target.value)}
                placeholder="Paste cookie value (with or without f.session=)"
                className="mb-3 font-mono text-xs"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && cookieValue.trim()) {
                    handleCookieLogin();
                  }
                }}
              />

              <Button
                onClick={handleCookieLogin}
                disabled={loading || !cookieValue.trim()}
                size="sm"
                className="w-full bg-orange-500 hover:bg-orange-600"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                    Logging in...
                  </>
                ) : (
                  <>
                    <Key className="w-3 h-3 mr-2" />
                    Login with Cookie
                  </>
                )}
              </Button>
            </Card>
          )}

          {/* Regular Phone Login */}
          <div className="flex border-2 rounded-xl overflow-hidden focus-within:border-primary transition-colors">
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
              autoFocus={!showCookieInput}
            />
          </div>

          <Button
            onClick={handleSendOTP}
            disabled={loading || phone.length !== 10}
            className="w-full py-6 text-base font-semibold"
            data-testid="button-send-otp"
          >
            {loading && !showCookieInput ? (
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

      <p className="text-center text-muted-foreground text-xs">
        By continuing, you agree to our Terms of Service & Privacy Policy
      </p>

      {/* Secret hint for testers */}
      {!showCookieInput && (
        <p className="text-center text-muted-foreground/50 text-[10px] mt-2">
          💡 Tip: Double tap logo for dev mode
        </p>
      )}
    </div>
  );
}
