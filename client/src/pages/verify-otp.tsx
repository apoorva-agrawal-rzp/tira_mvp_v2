import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { useMCP } from '@/hooks/use-mcp';
import { useAppStore } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function VerifyOTPPage() {
  const [otp, setOtp] = useState(['', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(30);
  const [, setLocation] = useLocation();
  const { invoke } = useMCP();
  const { phone, otpRequestId, setSession, setUser, setOtpRequestId } = useAppStore();
  const { toast } = useToast();
  const inputRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

  useEffect(() => {
    if (!phone || !otpRequestId) {
      setLocation('/login');
      return;
    }
    inputRefs[0].current?.focus();
  }, [phone, otpRequestId]);

  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      const digits = value.replace(/\D/g, '').split('').slice(0, 4);
      const newOtp = [...otp];
      digits.forEach((digit, i) => {
        if (index + i < 4) {
          newOtp[index + i] = digit;
        }
      });
      setOtp(newOtp);
      const nextIndex = Math.min(index + digits.length, 3);
      inputRefs[nextIndex].current?.focus();
      return;
    }

    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 3) {
      inputRefs[index + 1].current?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
  };

  const handleVerify = async () => {
    const otpString = otp.join('');
    if (otpString.length !== 4) {
      toast({
        title: 'Incomplete OTP',
        description: 'Please enter the complete 4-digit OTP',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const result = await invoke<{
        session_cookie?: string;
        cookies?: string;
        f_session?: string;
        authentication?: {
          cookies?: string;
          session_token?: string;
          user_info?: {
            first_name?: string;
            last_name?: string;
            emails?: Array<{ email?: string }>;
          };
        };
        response?: {
          user?: {
            first_name?: string;
            last_name?: string;
            emails?: Array<{ email?: string }>;
          };
        };
        user?: { name?: string; email?: string; first_name?: string; last_name?: string };
        name?: string;
        email?: string;
      }>('tira_verify_otp', {
        otp: otpString,
        request_id: otpRequestId,
      });

      // Extract session from various possible response formats
      const sessionCookie = 
        result.authentication?.cookies || 
        result.session_cookie || 
        result.cookies || 
        result.f_session || 
        '';
      
      // Extract user info from various possible response formats
      const userInfo = result.authentication?.user_info || result.response?.user || result.user;
      const firstName = userInfo?.first_name || result.user?.name?.split(' ')[0] || result.name || '';
      const lastName = userInfo?.last_name || '';
      const email = userInfo?.emails?.[0]?.email || result.user?.email || result.email || '';
      const fullName = lastName ? `${firstName} ${lastName}` : firstName;

      setSession(sessionCookie);
      setUser({
        phone: phone || '',
        name: fullName,
        email: email,
      });

      toast({
        title: 'Welcome!',
        description: `You have been logged in successfully${fullName ? `, ${fullName}` : ''}`,
      });

      setLocation('/home');
    } catch (err) {
      toast({
        title: 'Invalid OTP',
        description: 'Please check and try again',
        variant: 'destructive',
      });
      setOtp(['', '', '', '']);
      inputRefs[0].current?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0 || !phone) return;

    try {
      const result = await invoke<{ request_id: string }>('tira_send_otp', {
        mobile: phone,
        country_code: '91',
      });
      
      setOtpRequestId(result.request_id);
      setResendTimer(30);
      setOtp(['', '', '', '']);
      inputRefs[0].current?.focus();
      
      toast({
        title: 'OTP Resent',
        description: 'A new OTP has been sent to your phone',
      });
    } catch (err) {
      toast({
        title: 'Failed to resend OTP',
        description: 'Please try again',
        variant: 'destructive',
      });
    }
  };

  const maskedPhone = phone ? `${phone.slice(0, 2)}XXXXXX${phone.slice(-2)}` : '';
  const isOtpComplete = otp.join('').length === 4;

  return (
    <div className="min-h-screen flex flex-col p-6 bg-background">
      <Button
        variant="ghost"
        onClick={() => setLocation('/login')}
        className="self-start -ml-2 mb-6"
        data-testid="button-back"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back
      </Button>

      <h1 className="text-2xl font-bold mb-2">Verify OTP</h1>
      <p className="text-muted-foreground mb-8">
        Enter the 4-digit code sent to +91 {maskedPhone}
      </p>

      <div className="flex justify-center gap-3 mb-6">
        {otp.map((digit, index) => (
          <input
            key={index}
            ref={inputRefs[index]}
            type="tel"
            inputMode="numeric"
            maxLength={4}
            value={digit}
            onChange={(e) => handleOtpChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            className={cn(
              'w-14 h-14 text-center text-2xl font-bold border-2 rounded-xl outline-none transition-colors',
              'focus:border-primary',
              digit ? 'border-primary bg-primary/5' : 'border-border'
            )}
            data-testid={`input-otp-${index}`}
          />
        ))}
      </div>

      <button
        onClick={handleResend}
        disabled={resendTimer > 0}
        className={cn(
          'text-sm mb-6 text-center transition-colors',
          resendTimer > 0 ? 'text-muted-foreground' : 'text-primary font-medium'
        )}
        data-testid="button-resend-otp"
      >
        {resendTimer > 0
          ? `Resend OTP in 00:${resendTimer.toString().padStart(2, '0')}`
          : 'Resend OTP'}
      </button>

      <Button
        onClick={handleVerify}
        disabled={loading || !isOtpComplete}
        className="w-full py-6 text-base font-semibold"
        data-testid="button-verify-otp"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Verifying...
          </>
        ) : (
          'VERIFY'
        )}
      </Button>
    </div>
  );
}
