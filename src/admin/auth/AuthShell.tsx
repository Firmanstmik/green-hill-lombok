import { useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { Eye, EyeOff } from 'lucide-react';
// The official Green Hill logo, the same optimised files the public header and footer use.
import logoIvory from '@/assets/greenhill/hero/green-hill-logo-hero-112.webp';
import logoIvory2x from '@/assets/greenhill/hero/green-hill-logo-hero-168.webp';
import logoSolid from '@/assets/greenhill/hero/green-hill-logo-solid-112.webp';
import logoSolid2x from '@/assets/greenhill/hero/green-hill-logo-solid-168.webp';

/**
 * The private entrance to Green Hill: shared by Admin sign-in and the
 * password update page. Desktop is a forest/ivory split; phones get a single
 * ivory column with the logo, content and a quiet brand line.
 */
export function AuthShell({ children, homeHref }: { children: ReactNode; homeHref: string }) {
  return (
    <div className="gh-admin">
      <div className="gha-auth">
        <aside className="gha-auth__side" aria-hidden>
          <img className="gha-auth__side-logo" src={logoIvory} srcSet={`${logoIvory} 410w, ${logoIvory2x} 615w`} sizes="205px" alt="" width={205} height={56} />
          <div className="gha-auth__side-copy">
            <span className="gha-auth__rule" />
            <p className="gha-auth__quote">A quiet place to look after every opportunity and every conversation.</p>
          </div>
          <p className="gha-auth__brandline">Green Hill Lombok · Curated Land &amp; Investments</p>
        </aside>

        <main className="gha-auth__main">
          <div className="gha-auth__column">
            <a className="gha-auth__logo" href={homeHref} aria-label="Green Hill Lombok — back to the website">
              <img src={logoSolid} srcSet={`${logoSolid} 410w, ${logoSolid2x} 615w`} sizes="(min-width: 480px) 188px, 164px" alt="Green Hill Lombok" width={176} height={48} />
            </a>
            <div className="gha-auth__body">{children}</div>
            <p className="gha-auth__foot">
              <span>Green Hill Lombok</span>
              <span>Curated Land &amp; Investments</span>
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}

export function AuthHeading({ eyebrow = 'Private access', title, lead }: { eyebrow?: string; title: string; lead?: ReactNode }) {
  return (
    <header className="gha-auth__head">
      <p className="gha-eyebrow">{eyebrow}</p>
      <h1 className="gha-auth__title">{title}</h1>
      {lead ? <p className="gha-auth__lead">{lead}</p> : null}
    </header>
  );
}

/** Calm inline message; `tone="error"` is announced as an alert. */
export function AuthNotice({ tone = 'error', id, children }: { tone?: 'error' | 'info' | 'success'; id?: string; children: ReactNode }) {
  return (
    <div id={id} className={`gha-auth__notice gha-auth__notice--${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      {children}
    </div>
  );
}

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>;

/** Password input with an accessible show/hide control that never covers the text. */
export function PasswordInput(props: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="gha-auth__pw">
      <input {...props} type={visible ? 'text' : 'password'} className="gha-input gha-auth__input" />
      <button
        type="button"
        className="gha-auth__eye"
        onClick={() => setVisible((value) => !value)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
        aria-controls={props.id}
      >
        {visible ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
      </button>
    </div>
  );
}
