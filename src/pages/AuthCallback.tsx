import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/contexts/LanguageContext';
import { Loader2 } from '@/icons/iconsax';

/**
 * Auth Callback Page
 * Handles post-email-verification redirects from Supabase.
 * Green Hill has one signed-in role (admin). A signed-in user goes to the
 * admin, where the database (`is_admin()`) decides access; everyone else
 * goes home.
 */
const AuthCallback = () => {
  const { t, language } = useLanguage();
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (active) navigate(data.session ? `/${language}/admin` : `/${language}`, { replace: true });
    });
    return () => {
      active = false;
    };
  }, [navigate, language]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-brand-ink mx-auto" />
        <p className="text-lg font-medium text-foreground">{t('auth.callback.verifying')}</p>
        <p className="text-sm text-muted-foreground">{t('auth.callback.pleaseWait')}</p>
      </div>
    </div>
  );
};

export default AuthCallback;
