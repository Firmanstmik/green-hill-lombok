import logoSolid from '@/assets/greenhill/hero/green-hill-logo-solid-112.webp';
import logoSolid2x from '@/assets/greenhill/hero/green-hill-logo-solid-168.webp';
import './GreenHillLoader.css';

/**
 * Green Hill's loading moment: the official logo (the same files the public
 * header uses, so usually already cached), a slow breath and a fine gold line.
 * Only for application-level waits (first load of a page, restoring a
 * session). Content inside pages uses skeletons; buttons show their own progress.
 * It stays invisible for the first 200 ms, so fast loads never flash.
 */
export function GreenHillLoader({ label = 'Loading Green Hill' }: { label?: string }) {
  return (
    <div className="ghl" role="status" aria-live="polite">
      <div className="ghl__mark">
        <img
          className="ghl__logo"
          src={logoSolid}
          srcSet={`${logoSolid} 410w, ${logoSolid2x} 615w`}
          sizes="176px"
          alt=""
          width={176}
          height={48}
          decoding="async"
        />
        <span className="ghl__line" aria-hidden>
          <span className="ghl__line-fill" />
        </span>
      </div>
      <span className="ghl__label">{label}…</span>
    </div>
  );
}
