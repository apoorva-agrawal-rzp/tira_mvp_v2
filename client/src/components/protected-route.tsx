import { useEffect } from 'react';
import { useLocation, Redirect } from 'wouter';
import { useAppStore } from '@/lib/store';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const [, setLocation] = useLocation();
  const { isLoggedIn, isHydrated } = useAppStore();

  useEffect(() => {
    // Wait for store to hydrate from localStorage
    if (isHydrated && !isLoggedIn()) {
      setLocation('/login');
    }
  }, [isHydrated, setLocation]);

  // Show nothing while checking authentication
  if (!isHydrated) {
    return null;
  }

  // Redirect to login if not authenticated
  if (!isLoggedIn()) {
    return <Redirect to="/login" />;
  }

  return <>{children}</>;
}

