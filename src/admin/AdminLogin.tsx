import { useEffect, useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import logoIvory from '@/assets/greenhill/hero/green-hill-logo-hero-168.webp';
import logoSolid from '@/assets/greenhill/hero/green-hill-logo-solid-168.webp';
import { LOCAL_PREVIEW_AVAILABLE, useAdminSession } from './AdminSession';
import { useAdminPath } from './paths';
import { Field } from './ui/primitives';

export function AdminLogin() {
  const { status, email: signedInAs, signIn, signOut, enterLocalPreview, sendPasswordReset } = useAdminSession();
  const { admin, site } = useAdminPath();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    document.title = 'Sign in · Green Hill Admin';
  }, []);

  if (status === 'ready') return <Navigate to={admin()} replace />;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setNotice('');
    if (!email.trim() || !password) {
      setError('Enter your email address and password.');
      return;
    }
    setBusy(true);
    try {
      await signIn(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign in.');
    } finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    setError('');
    setNotice('');
    if (!email.trim()) {
      setError('Enter your email address first, then choose “Forgot password”.');
      return;
    }
    try {
      await sendPasswordReset(email);
      setNotice('If that address has an account, a reset link is on its way.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send a reset link.');
    }
  };

  return (
    <div className="gh-admin">
      <div className="gha-login">
        <aside className="gha-login__side" aria-hidden>
          <img className="gha-login__logo" src={logoIvory} alt="" width={220} height={60} />
          <p className="gha-login__quote">A quiet place to look after every opportunity and every conversation.</p>
          <p className="gha-login__small">Green Hill Lombok · Curated Land &amp; Investments</p>
        </aside>

        <main className="gha-login__form">
          <div className="gha-login__card">
            <img className="gha-login__mobile-logo" src={logoSolid} alt="Green Hill Lombok" width={180} height={49} />
            <p className="gha-eyebrow">Admin</p>
            <h1 className="gha-title">Sign in</h1>

            {status === 'loading' ? (
              <p className="gha-lead" role="status">
                Checking your session…
              </p>
            ) : null}

            {status === 'unavailable' ? (
              <div className="gha-alert gha-alert--info" style={{ marginTop: 24 }} role="status">
                <div>
                  <span className="gha-alert__title">The Green Hill database is not connected yet</span>
                  <span>
                    The admin will be available once a Green Hill Supabase project is configured for this site.
                  </span>
                </div>
              </div>
            ) : null}

            {status === 'forbidden' ? (
              <div className="gha-alert" style={{ marginTop: 24 }} role="alert">
                <div>
                  <span className="gha-alert__title">This account does not have admin access</span>
                  <span>
                    {signedInAs ? `${signedInAs} is signed in, ` : ''}but only the Green Hill admin account can open
                    this area.
                  </span>
                  <div style={{ marginTop: 12 }}>
                    <button type="button" className="gha-btn gha-btn--secondary gha-btn--sm" onClick={() => void signOut()}>
                      Sign out
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            {status === 'signed-out' && !LOCAL_PREVIEW_AVAILABLE ? (
              <form onSubmit={submit} noValidate style={{ marginTop: 28 }}>
                <Field label="Email address">
                  {(control) => (
                    <input
                      {...control}
                      className="gha-input"
                      type="email"
                      autoComplete="username"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                    />
                  )}
                </Field>
                <Field label="Password">
                  {(control) => (
                    <input
                      {...control}
                      className="gha-input"
                      type="password"
                      autoComplete="current-password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                    />
                  )}
                </Field>

                {error ? (
                  <p className="gha-error" role="alert" style={{ marginTop: 16 }}>
                    {error}
                  </p>
                ) : null}
                {notice ? (
                  <p className="gha-hint" role="status" style={{ marginTop: 16 }}>
                    {notice}
                  </p>
                ) : null}

                <button type="submit" className="gha-btn gha-btn--primary gha-btn--block" style={{ marginTop: 24 }} disabled={busy}>
                  {busy ? <Loader2 size={16} className="gha-spin" aria-hidden /> : null}
                  {busy ? 'Signing in…' : 'Sign in'}
                </button>
                <button type="button" className="gha-btn gha-btn--ghost gha-btn--block" style={{ marginTop: 8 }} onClick={() => void reset()}>
                  Forgot password
                </button>
              </form>
            ) : null}

            {status === 'signed-out' && LOCAL_PREVIEW_AVAILABLE ? (
              <div style={{ marginTop: 24 }}>
                <div className="gha-alert gha-alert--gold">
                  <div>
                    <span className="gha-alert__title">Development build without a database</span>
                    <span>
                      You can open a local preview of the admin. Records are kept in this browser only and are never
                      published. This option does not exist in production.
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  className="gha-btn gha-btn--primary gha-btn--block"
                  style={{ marginTop: 20 }}
                  onClick={() => void enterLocalPreview()}
                >
                  Open local preview
                </button>
              </div>
            ) : null}

            <p className="gha-hint" style={{ marginTop: 32 }}>
              <a className="gha-link" href={site('/')}>
                Back to the website
              </a>
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
