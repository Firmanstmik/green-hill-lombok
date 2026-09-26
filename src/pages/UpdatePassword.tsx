import { useState, useEffect, type FormEvent } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/contexts/LanguageContext';
import '@/admin/admin.css';
import { GreenHillLoader } from '@/components/brand/GreenHillLoader';
import { AuthHeading, AuthNotice, AuthShell, PasswordInput } from '@/admin/auth/AuthShell';
import { AUTH_MESSAGES, authErrorMessage, resetLinkProblem } from '@/admin/auth/authMessages';
import { PASSWORD_RULES, meetsPasswordPolicy } from '@/admin/auth/passwordPolicy';

type LinkState = 'checking' | 'valid' | 'expired' | 'invalid';

const UpdatePassword = () => {
  const { language } = useLanguage();
  const signInHref = `/${language}/admin/login`;

  // A failed reset link arrives with error_code in the URL; otherwise wait for the recovery session.
  const [linkState, setLinkState] = useState<LinkState>(() => resetLinkProblem(window.location) ?? 'checking');
  const [accountEmail, setAccountEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionLost, setSessionLost] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    document.title = 'Set a new password · Green Hill';
  }, []);

  // Check for valid recovery session
  useEffect(() => {
    if (linkState !== 'checking') return;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setAccountEmail(session?.user.email ?? '');
        setLinkState('valid');
      }
    });

    // Also check if there's already a session (user may have already been redirected)
    let timer: ReturnType<typeof setTimeout> | undefined;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setAccountEmail(session.user.email ?? '');
        setLinkState('valid');
      } else {
        // Give a brief moment for the auth state change to fire
        timer = setTimeout(() => {
          setLinkState((prev) => (prev === 'checking' ? 'invalid' : prev));
        }, 2000);
      }
    });

    return () => {
      subscription?.unsubscribe();
      if (timer) clearTimeout(timer);
    };
  }, [linkState]);

  const handleUpdatePassword = async (event: FormEvent) => {
    event.preventDefault();
    if (loading) return;
    setError(null);

    if (!meetsPasswordPolicy(password)) {
      setError(AUTH_MESSAGES.weakPassword);
      return;
    }
    if (password !== confirmPassword) {
      setError(AUTH_MESSAGES.mismatch);
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        const message = authErrorMessage(error);
        setSessionLost(message === AUTH_MESSAGES.sessionMissing);
        setError(message);
        return;
      }
      setDone(true);
    } catch (err) {
      setError(authErrorMessage(err as { message?: string; name?: string }));
    } finally {
      setLoading(false);
    }
  };

  const mismatch = confirmPassword.length > 0 && confirmPassword !== password;

  if (linkState === 'checking') return <GreenHillLoader label="Verifying your link" />;

  return (
    <AuthShell homeHref={`/${language}`}>

      {linkState === 'expired' || linkState === 'invalid' ? (
        <>
          <AuthHeading title={linkState === 'expired' ? 'This link has expired' : 'This link isn’t valid'} />
          <AuthNotice tone="info">
            <span>
              {linkState === 'expired'
                ? AUTH_MESSAGES.expiredLink
                : 'This password reset link can’t be used, perhaps because it was already opened. Please request a new one.'}
            </span>
          </AuthNotice>
          <a className="gha-btn gha-btn--primary gha-auth__submit" href={`${signInHref}?reset=1`}>
            Request a new link
          </a>
          <div className="gha-auth__links">
            <a className="gha-auth__textlink" href={signInHref}>
              Back to sign in
            </a>
          </div>
        </>
      ) : null}

      {linkState === 'valid' && done ? (
        <div className="gha-auth__success">
          <span className="gha-auth__seal" aria-hidden>
            <Check size={20} />
          </span>
          <AuthHeading title="Password updated" lead="Your Green Hill account is ready." />
          <a className="gha-btn gha-btn--primary gha-auth__submit" href={`/${language}/admin`}>
            Continue to the admin
          </a>
        </div>
      ) : null}

      {linkState === 'valid' && !done ? (
        <>
          <AuthHeading
            title="Set a new password"
            lead={
              accountEmail ? (
                <>
                  Choose a strong password for <strong>{accountEmail}</strong>.
                </>
              ) : (
                'Choose a strong password for your account.'
              )
            }
          />
          <form className="gha-auth__form" onSubmit={handleUpdatePassword} noValidate aria-busy={loading}>
            {/* Lets password managers save the new password against the right account. */}
            {accountEmail ? (
              <input type="email" name="username" autoComplete="username" value={accountEmail} readOnly hidden />
            ) : null}
            <div className="gha-field">
              <label className="gha-label" htmlFor="new-password">
                New password
              </label>
              <PasswordInput
                id="new-password"
                name="new-password"
                autoComplete="new-password"
                aria-describedby="password-rules"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
                }}
                disabled={loading}
              />
              <ul className="gha-auth__rules" id="password-rules" aria-label="Password requirements">
                {PASSWORD_RULES.map((rule) => {
                  const met = rule.test(password);
                  return (
                    <li key={rule.id} className={met ? 'is-met' : undefined}>
                      <span className="gha-auth__rule-mark" aria-hidden>
                        {met ? <Check size={12} strokeWidth={2.5} /> : null}
                      </span>
                      {rule.label}
                      <span className="gha-sr-only">{met ? ' (met)' : ' (not yet met)'}</span>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="gha-field">
              <label className="gha-label" htmlFor="confirm-password">
                Confirm password
              </label>
              <PasswordInput
                id="confirm-password"
                name="confirm-password"
                autoComplete="new-password"
                aria-invalid={mismatch || undefined}
                aria-describedby={mismatch ? 'confirm-hint' : undefined}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setError(null);
                }}
                disabled={loading}
              />
              {mismatch ? (
                <p className="gha-hint" id="confirm-hint">
                  {AUTH_MESSAGES.mismatch}
                </p>
              ) : null}
            </div>

            {error ? (
              <AuthNotice>
                <span>{error}</span>
                {sessionLost ? (
                  <a className="gha-auth__textlink" href={`${signInHref}?reset=1`}>
                    Request a new link
                  </a>
                ) : null}
              </AuthNotice>
            ) : null}

            <button type="submit" className="gha-btn gha-btn--primary gha-auth__submit" disabled={loading}>
              {loading ? <Loader2 size={17} className="gha-spin" aria-hidden /> : null}
              {loading ? 'Updating password…' : 'Update password'}
            </button>
          </form>
          <div className="gha-auth__links">
            <a className="gha-auth__textlink" href={signInHref}>
              Back to sign in
            </a>
          </div>
        </>
      ) : null}
    </AuthShell>
  );
};

export default UpdatePassword;
