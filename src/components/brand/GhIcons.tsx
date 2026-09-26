import type { ReactNode, SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & {
  size?: number | string;
  title?: string;
};

function GhIconBase({
  size = 24,
  title,
  children,
  className,
  ...rest
}: IconProps & { children: ReactNode }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      {...rest}
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}

/** Sealed correspondence — not a generic mail glyph. */
export function GhIconLetter({ size, className, ...rest }: IconProps) {
  return (
    <GhIconBase size={size} className={className} {...rest}>
      <rect x="3.5" y="5.5" width="17" height="13" rx="1.25" stroke="currentColor" strokeWidth="1.35" />
      <path
        d="M3.75 6.9 11.2 12.1a1.4 1.4 0 0 0 1.6 0L20.25 6.9"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.4 14.2h5.2"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.55"
      />
      <circle cx="12" cy="9.15" r="1.05" fill="currentColor" opacity="0.35" />
    </GhIconBase>
  );
}

/** Quiet conversation — twin arcs, editorial mark. */
export function GhIconConverse({ size, className, ...rest }: IconProps) {
  return (
    <GhIconBase size={size} className={className} {...rest}>
      <path
        d="M5.2 7.4c0-1.5 1.35-2.7 3.05-2.7h2.1c1.7 0 3.05 1.2 3.05 2.7v2.35c0 1.5-1.35 2.7-3.05 2.7H8.9L6.3 14.1V12.45c-.7-.55-1.1-1.4-1.1-2.35V7.4Z"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinejoin="round"
      />
      <path
        d="M13.6 10.1h2.15c1.7 0 3.05 1.15 3.05 2.55v1.85c0 .85-.4 1.6-1.05 2.1v1.45l-2.35-1.45h-.8c-1.7 0-3.05-1.15-3.05-2.55v-.35"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinejoin="round"
      />
      <path
        d="M7.35 8.55h3.1M7.35 10.35h2.1"
        stroke="currentColor"
        strokeWidth="1.15"
        strokeLinecap="round"
        opacity="0.5"
      />
    </GhIconBase>
  );
}

/** Official WhatsApp glyph (Meta brand mark) — filled for premium recognition. */
export function GhIconWhatsApp({ size, className, ...rest }: IconProps) {
  return (
    <GhIconBase size={size} className={className} {...rest}>
      <path
        fill="currentColor"
        d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"
      />
    </GhIconBase>
  );
}

/** Official Instagram glyph — camera seal. */
export function GhIconInstagram({ size, className, ...rest }: IconProps) {
  return (
    <GhIconBase size={size} className={className} {...rest}>
      <path
        fill="currentColor"
        d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"
      />
    </GhIconBase>
  );
}

/** Refined viewfinder — social without the stock Instagram glyph. */
export function GhIconViewfinder({ size, className, ...rest }: IconProps) {
  return (
    <GhIconBase size={size} className={className} {...rest}>
      <rect x="3.5" y="5" width="17" height="14" rx="2.2" stroke="currentColor" strokeWidth="1.35" />
      <circle cx="12" cy="12" r="3.35" stroke="currentColor" strokeWidth="1.35" />
      <circle cx="12" cy="12" r="1.15" fill="currentColor" opacity="0.4" />
      <path
        d="M7.2 5V4.35A1.1 1.1 0 0 1 8.3 3.25h2.05A1.1 1.1 0 0 1 11.45 4.35V5"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
      <circle cx="17.15" cy="8.15" r="0.85" fill="currentColor" />
    </GhIconBase>
  );
}

/** Place mark — hillside pin with brand wave. */
export function GhIconPlace({ size, className, ...rest }: IconProps) {
  return (
    <GhIconBase size={size} className={className} {...rest}>
      <path
        d="M12 21.25s6.75-6.1 6.75-11.05A6.75 6.75 0 0 0 12 3.45a6.75 6.75 0 0 0-6.75 6.75C5.25 15.15 12 21.25 12 21.25Z"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinejoin="round"
      />
      <path
        d="M8.35 12.1c.85.35 1.9.75 2.85.85 1.05.1 2.05-.15 3.05-.7.95-.5 2.2-1.35 2.9-1.85"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.7"
      />
      <circle cx="12" cy="10.15" r="1.55" stroke="currentColor" strokeWidth="1.2" />
    </GhIconBase>
  );
}

/** Compass rose — navigational, not the stock Lucide compass. */
export function GhIconRose({ size, className, ...rest }: IconProps) {
  return (
    <GhIconBase size={size} className={className} {...rest}>
      <circle cx="12" cy="12" r="8.25" stroke="currentColor" strokeWidth="1.3" />
      <path
        d="M12 5.4 13.55 12 12 18.6 10.45 12Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path
        d="M5.4 12 12 10.45 18.6 12 12 13.55Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
        opacity="0.55"
      />
      <circle cx="12" cy="12" r="1.1" fill="currentColor" />
    </GhIconBase>
  );
}

/** On-the-ground — twin hills + gold crest line. */
export function GhIconHills({ size, className, ...rest }: IconProps) {
  return (
    <GhIconBase size={size} className={className} {...rest}>
      <path
        d="M3.5 16.8 8.2 9.4a1.3 1.3 0 0 1 2.15 0L12 11.6l2.4-3.55a1.3 1.3 0 0 1 2.2 0L20.5 16.8"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3.8 18.35h16.4"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        opacity="0.45"
      />
      <path
        d="M6.4 14.9c1.3.4 2.7.75 4.15.75 1.55 0 3.05-.4 4.4-.95"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.65"
      />
    </GhIconBase>
  );
}

/** Curated seal — crest with check, not a generic shield. */
export function GhIconSeal({ size, className, ...rest }: IconProps) {
  return (
    <GhIconBase size={size} className={className} {...rest}>
      <path
        d="M12 3.4 17.6 5.5v4.85c0 3.55-2.35 6.55-5.6 7.55-3.25-1-5.6-4-5.6-7.55V5.5L12 3.4Z"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinejoin="round"
      />
      <path
        d="M9.15 11.35 11.1 13.2l3.85-4.1"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </GhIconBase>
  );
}

/** Fine chevron in a quiet square frame — footer nav. */
export function GhIconChevronFrame({ size, className, ...rest }: IconProps) {
  return (
    <GhIconBase size={size} className={className} {...rest}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="2" stroke="currentColor" strokeWidth="1.2" opacity="0.35" />
      <path
        d="M10 8.25 13.75 12 10 15.75"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </GhIconBase>
  );
}

/** Soft arrow for CTA bars. */
export function GhIconArrow({ size, className, ...rest }: IconProps) {
  return (
    <GhIconBase size={size} className={className} {...rest}>
      <path
        d="M4.5 12h13.2"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path
        d="M13.4 7.6 18.5 12l-5.1 4.4"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </GhIconBase>
  );
}

/** Dock toggle — slender caret. */
export function GhIconCaretUp({ size, className, ...rest }: IconProps) {
  return (
    <GhIconBase size={size} className={className} {...rest}>
      <path
        d="M6.5 14.25 12 8.75l5.5 5.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </GhIconBase>
  );
}

export function GhIconCaretDown({ size, className, ...rest }: IconProps) {
  return (
    <GhIconBase size={size} className={className} {...rest}>
      <path
        d="M6.5 9.75 12 15.25l5.5-5.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </GhIconBase>
  );
}

/** Fine caret for framed footer links. */
export function GhIconCaretRight({ size, className, ...rest }: IconProps) {
  return (
    <GhIconBase size={size} className={className} {...rest}>
      <path
        d="M9.25 6.75 14.5 12 9.25 17.25"
        stroke="currentColor"
        strokeWidth="1.45"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </GhIconBase>
  );
}
