import { useEffect } from 'react';
import { PageHead } from '../ui/primitives';

/**
 * Placeholder by design. There is no relationships table yet, so nothing here
 * pretends to hold data. See the implementation report for the proposed model.
 */
export function RelationshipsPage() {
  useEffect(() => {
    document.title = 'Relationships · Green Hill Admin';
  }, []);

  return (
    <div className="gha-enter">
      <PageHead
        eyebrow="Planned"
        title="Relationships"
        lead="Landowners, developers, notaries, architects and hospitality partners: the people behind each opportunity."
      />
      <div className="gha-panel gha-panel--pad" style={{ maxWidth: 720 }}>
        <p style={{ margin: 0 }}>
          This workspace is not available yet. There is no place in the database to keep these contacts, and we would
          rather show nothing than something that does not save.
        </p>
        <p className="gha-hint" style={{ marginTop: 12 }}>
          When it is built, each relationship will have contact details, a role, private notes, and links to the
          opportunities it relates to. Until then, keep these contacts where you keep them today.
        </p>
      </div>
    </div>
  );
}
