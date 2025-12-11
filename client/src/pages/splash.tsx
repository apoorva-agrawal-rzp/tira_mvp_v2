import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { TiraLogoFull } from '@/components/tira-logo';
import { useAppStore } from '@/lib/store';
import { useMCP } from '@/hooks/use-mcp';
import { Loader2 } from 'lucide-react';

export default function SplashPage() {
  const [, setLocation] = useLocation();
  const { session, setSession, setUser } = useAppStore();
  const { invoke } = useMCP();

  useEffect(() => {
    const init = async () => {
      await new Promise((r) => setTimeout(r, 1500));

      // If user has a session, verify it
      if (session) {
        try {
          const result = await invoke<{ isAuthenticated?: boolean; user?: { name?: string; email?: string } }>(
            'check_user_session',
            { cookies: session }
          );
          
          if (result?.isAuthenticated || result?.user) {
            if (result.user) {
              setUser({
                phone: useAppStore.getState().phone || '',
                name: result.user.name,
                email: result.user.email,
              });
            }
          } else {
            // Session invalid, clear it
            setSession(null);
          }
        } catch (e) {
          console.log('Session check failed, clearing session');
          setSession(null);
        }
      }
      
      // Always redirect to home - allow browsing without login
      // Login will be required for cart/checkout operations
      setLocation('/home');
    };

    init();
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-pink-50/50 to-background dark:from-pink-950/20 p-6">
      <div className="flex-1 flex flex-col items-center justify-center">
        <TiraLogoFull className="mb-8 animate-in zoom-in-50 duration-500" />
        <Loader2 className="w-6 h-6 animate-spin text-primary mb-4" />
      </div>
      
      <div className="text-center animate-in fade-in-0 slide-in-from-bottom-4 duration-700 delay-300">
        <p className="text-muted-foreground text-sm">
          Powered by Razorpay Reserve Pay
        </p>
      </div>
    </div>
  );
}
