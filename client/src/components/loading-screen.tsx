import { TiraLogoFull } from '@/components/tira-logo';
import { Loader2 } from 'lucide-react';

export function LoadingScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-pink-50/50 to-background dark:from-pink-950/20">
      <TiraLogoFull className="mb-8" />
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
    </div>
  );
}

export function LoadingSpinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  return <Loader2 className={`${sizes[size]} animate-spin text-primary`} />;
}
