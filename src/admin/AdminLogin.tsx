import { useEffect, useState, type FormEvent } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Loader2 } from '@/icons/iconsax';
import { LOCAL_PREVIEW_AVAILABLE, useAdminSession } from './AdminSession';
import { useAdminPath } from './paths';
import { Field } from './ui/primitives';
import { AuthHeading, AuthNotice, AuthShell, PasswordInput } from './auth/AuthShell';
import { AUTH_MESSAGES, isValidEmail } from './auth/authMessages';
import { GreenHillLoader } from '@/components/brand/GreenHillLoader';

type View = 'sign-in' | 'reset' | 'reset-sent';

export function AdminLogin() {
  const { status, email: signedInAs, signIn, signOut, enterLocalPreview, sendPasswordReset } = useAdminSession();
  const { admin, site } = useAdminPath();
  const [searchParams] = useSearchParams();
  // `?reset=1` comes from an expired or invalid reset link: open the reset request directly.
  const [view, setView] = useState<View>(searchParams.get('reset') === '1' ? 'reset' : 'sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [emailInvalid, setEmailInvalid] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    document.title = view === 'sign-in' ? 'Sign in · Green Hill Admin' : 'Reset password · Green Hill Admin';
  }, [view]);

  if (status === 'ready') return <Navigate to={admin()} replace />;
  if (status === 'loading') return <GreenHillLoader label="Checking your session" />;

  const go = (next: View) => {
    setError('');
    setEmailInvalid(false);
    setView(next);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setError('');
    setEmailInvalid(false);
    if (!email.trim() || !password) {
      setError(AUTH_MESSAGES.missingFields);
      return;
    }
    if (!isValidEmail(email)) {
      setEmailInvalid(true);
      return;
    }
    setBusy(true);
    try {
      await signIn(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : AUTH_MESSAGES.unexpected);
    } finally {
      setBusy(false);
    }
  };

  const requestReset = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setError('');
    setEmailInvalid(false);
    if (!isValidEmail(email)) {
      setEmailInvalid(true);
      return;
    }
    setBusy(true);
    try {
      await sendPasswordReset(email);
      setView('reset-sent');
    } catch (err) {
      setError(err instanceof Error ? err.message : AUTH_MESSAGES.unexpected);
    } finally {
      setBusy(false);
    }
  };

  const emailField = (
    <Field label="Email address" error={emailInvalid ? AUTH_MESSAGES.invalidEmail : undefined}>
      {(control) => (
        <input
          {...control}
          className="gha-input gha-auth__input"
          type="email"
          name="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            setEmailInvalid(false);
          }}
        />
      )}
    </Field>
  );

  const backToSite = (
    <a className="gha-auth__back" href={site('/')}>
      <ArrowLeft size={15} aria-hidden />
      Back to Green Hill
    </a>
  );

  return (
    <AuthShell homeHref={site('/')}>
      {status === 'unavailable' ? (
        <>
          <AuthHeading title="Sign in" />
          <AuthNotice tone="info">
            <strong>The Green Hill database is not connected yet</strong>
            <span>The admin will be available once a Green Hill Supabase project is configured for this site.</span>
          </AuthNotice>
        </>
      ) : null}

      {status === 'forbidden' ? (
        <>
          <AuthHeading title="No admin access" />
          <AuthNotice tone="info">
            <strong>This account does not have admin access</strong>
            <span>
              {signedInAs ? `${signedInAs} is signed in, ` : ''}but only Green Hill admin accounts can open this area.
            </span>
          </AuthNotice>
          <button type="button" className="gha-btn gha-btn--secondary gha-auth__submit" onClick={() => void signOut()}>
            Sign out
          </button>
        </>
      ) : null}

      {status === 'signed-out' && !LOCAL_PREVIEW_AVAILABLE && view === 'sign-in' ? (
        <>
          <AuthHeading title="Sign in" lead="The Green Hill administration: opportunities, enquiries and the website." />
          <form className="gha-auth__form" onSubmit={submit} noValidate aria-busy={busy}>
            {emailField}
            <Field
              label="Password"
              aside={
                <button type="button" className="gha-auth__textlink" onClick={() => go('reset')}>
                  Forgot password?
                </button>
              }
            >
              {(control) => (
                <PasswordInput
                  {...control}
                  name="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              )}
            </Field>

            {error ? <AuthNotice>{error}</AuthNotice> : null}

            <button type="submit" className="gha-btn gha-btn--primary gha-auth__submit" disabled={busy}>
              {busy ? <Loader2 size={17} className="gha-spin" aria-hidden /> : null}
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </>
      ) : null}

      {status === 'signed-out' && !LOCAL_PREVIEW_AVAILABLE && view === 'reset' ? (
        <>
          <AuthHeading
            title="Reset your password"
            lead="Enter the email address of your Green Hill account and we’ll send you a link to choose a new password."
          />
          <form className="gha-auth__form" onSubmit={requestReset} noValidate aria-busy={busy}>
            {emailField}
            {error ? <AuthNotice>{error}</AuthNotice> : null}
            <button type="submit" className="gha-btn gha-btn--primary gha-auth__submit" disabled={busy}>
              {busy ? <Loader2 size={17} className="gha-spin" aria-hidden /> : null}
              {busy ? 'Sending…' : 'Send reset link'}
            </button>
          </form>
          <button type="button" className="gha-auth__textlink gha-auth__secondary" onClick={() => go('sign-in')}>
            Back to sign in
          </button>
        </>
      ) : null}

      {status === 'signed-out' && !LOCAL_PREVIEW_AVAILABLE && view === 'reset-sent' ? (
        <>
          <AuthHeading title="Check your email" />
          <AuthNotice tone="success">
            <span>
              If <strong>{email.trim()}</strong> belongs to a Green Hill account, a reset link is on its way. The link is
              valid for one hour.
            </span>
          </AuthNotice>
          <button type="button" className="gha-btn gha-btn--secondary gha-auth__submit" onClick={() => go('sign-in')}>
            Back to sign in
          </button>
        </>
      ) : null}

      {status === 'signed-out' && LOCAL_PREVIEW_AVAILABLE ? (
        <>
          <AuthHeading title="Sign in" />
          <div className="gha-alert gha-alert--gold">
            <div>
              <span className="gha-alert__title">Development build without a database</span>
              <span>
                You can open a local preview of the admin. Records are kept in this browser only and are never published.
                This option does not exist in production.
              </span>
            </div>
          </div>
          <button type="button" className="gha-btn gha-btn--primary gha-auth__submit" onClick={() => void enterLocalPreview()}>
            Open local preview
          </button>
        </>
      ) : null}

      <div className="gha-auth__links">{backToSite}</div>
    </AuthShell>
  );
}
