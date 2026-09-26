import type { ReactNode } from 'react';
import type { Opportunity, StepId } from '../../domain/opportunity';

export type StepProps = {
  o: Opportunity;
  update: (patch: Partial<Opportunity>) => void;
  errors: Partial<Record<string, string>>;
  goTo: (step: StepId) => void;
};

export function StepFrame({
  number,
  title,
  lead,
  children,
}: {
  number: string;
  title: string;
  lead: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="gha-stage" aria-labelledby="gha-stage-title">
      <header className="gha-stage__head">
        <span className="gha-stage__num">Step {number}</span>
        <h2 className="gha-stage__title" id="gha-stage-title" tabIndex={-1}>
          {title}
        </h2>
        <p className="gha-stage__lead">{lead}</p>
      </header>
      <div className="gha-stage__panel">{children}</div>
    </section>
  );
}

/** Parses a user-typed number. Empty means "not specified" (null), never 0. */
export function parseNumber(value: string): number | null {
  const cleaned = value.replace(/[^\d.]/g, '');
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

export function numberText(value: number | null): string {
  return value == null ? '' : String(value);
}
