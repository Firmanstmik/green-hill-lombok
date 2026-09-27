import logoSolid from '@/assets/greenhill/hero/green-hill-logo-solid-112.webp';
import logoSolid2x from '@/assets/greenhill/hero/green-hill-logo-solid-168.webp';
import './GreenHillLoader.css';

/**
 * Green Hill's loading moment: the official logo (the same files the public
 * header uses, so usually already cached) and a fine gold rule drawn beneath it.
 *
 * - `wait` (default): for route and session waits. Invisible for the first
 *   200 ms, so fast or cached loads never flash; then the same reveal.
 * - `intro`: the opening of the public site on a cold load (BrandIntro). The
 *   ivory ground is there at once; `leaving` fades it into the page.
 *
 * Sequence (from when the loader is shown): logo 150→410 ms, gold rule
 * 450→750 ms; while still waiting, the logo breathes and the rule glints.
 */
export function GreenHillLoader({
  label = 'Loading Green Hill',
  mode = 'wait',
  leaving = false,
}: {
  label?: string;
  mode?: 'wait' | 'intro';
  leaving?: boolean;
}) {
  return (
    <div className={`ghl ghl--${mode}`} data-leaving={leaving || undefined} role="status" aria-live="polite">
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
