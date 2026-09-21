import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/contexts/LanguageContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { AlertCircle, Lock, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

const UpdatePassword = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isValidSession, setIsValidSession] = useState<boolean | null>(null);

  // Check for valid recovery session
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsValidSession(true);
      }
    });

    // Also check if there's already a session (user may have already been redirected)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setIsValidSession(true);
      } else {
        // Give a brief moment for the auth state change to fire
        setTimeout(() => {
          setIsValidSession((prev) => prev === null ? false : prev);
        }, 2000);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const handleUpdatePassword = async () => {
    if (!password.trim()) {
      setError('Please enter a new password');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        throw error;
      }

      toast.success('Password updated successfully');
      navigate(`/${language}/`, { replace: true });
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to update password. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Loading state while checking session
  if (isValidSession === null) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center pb-24">
        <span className="text-2xl font-serif tracking-wide text-foreground mb-10 block">Green Hill</span>
        <p className="text-sm text-muted-foreground">Verifying your reset link...</p>
      </div>
    );
  }

  // Invalid or expired token
  if (isValidSession === false) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center pb-24 px-6">
        <span className="text-2xl font-serif tracking-wide text-foreground mb-14 block">Green Hill</span>
        <div className="w-full max-w-md text-center space-y-6">
          <h1 className="text-2xl font-bold text-foreground">Link expired</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            This password reset link is no longer valid. Please request a new one.
          </p>
          <Button
            onClick={() => navigate(`/${language}/`, { replace: true })}
            className="h-14 px-8 text-base font-semibold rounded-xl bg-ukon-navy text-white hover:bg-ukon-navy/90 hover:shadow-lg hover:shadow-ukon-navy/20 transition-all duration-300"
          >
            Return home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center pb-24 px-6">
      <span className="text-2xl font-serif tracking-wide text-foreground mb-14 block">Green Hill</span>
      <div className="w-full max-w-md space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Set new password</h1>
          <p className="text-sm text-muted-foreground">
            Choose a strong password for your account.
          </p>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200">
            <p className="text-sm text-red-600 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </p>
          </div>
        )}

        <div className="space-y-6">
          <div>
            <Label htmlFor="new-password" className="text-sm font-medium mb-2 block">
              New password (min. 8 characters)
            </Label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
              <Input
                id="new-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter new password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleUpdatePassword();
                }}
                disabled={loading}
                className="h-14 pl-12 pr-12 text-base rounded-xl border-border/50 focus:border-ukon-navy/50 focus:ring-2 focus:ring-ukon-navy/10 transition-all duration-200"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          <div>
            <Label htmlFor="confirm-password" className="text-sm font-medium mb-2 block">
              Confirm password
            </Label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
              <Input
                id="confirm-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleUpdatePassword();
                }}
                disabled={loading}
                className="h-14 pl-12 pr-5 text-base rounded-xl border-border/50 focus:border-ukon-navy/50 focus:ring-2 focus:ring-ukon-navy/10 transition-all duration-200"
              />
            </div>
          </div>

          <Button
            onClick={handleUpdatePassword}
            disabled={loading}
            className="w-full h-14 text-base font-semibold rounded-xl bg-ukon-navy text-white hover:bg-ukon-navy/90 hover:shadow-lg hover:shadow-ukon-navy/20 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Updating...' : 'Update password'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default UpdatePassword;

