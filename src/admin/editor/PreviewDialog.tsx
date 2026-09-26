import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { ArrowUpRight, Monitor, Smartphone, X } from 'lucide-react';

/**
 * Shows the real public memo (PropertyDetail in preview mode) inside the admin.
 * No separate preview design exists, so what Reece sees is what visitors get.
 */
export function PreviewDialog({
  open,
  onOpenChange,
  url,
  isPrivate,
  note,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string;
  isPrivate: boolean;
  note?: string;
}) {
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="gha-overlay gha-portal" />
        <Dialog.Content className="gha-dialog gha-dialog--wide gha-portal">
          <div className="gha-preview-bar">
            <div style={{ flex: '1 1 240px', minWidth: 0 }}>
              <Dialog.Title className="gha-dialog__title" style={{ fontSize: 18 }}>
                Preview
              </Dialog.Title>
              <Dialog.Description className="gha-hint">
                {note
                  ? note
                  : isPrivate
                  ? 'How the memo would look. Private opportunities are never shown to visitors.'
                  : 'Exactly as visitors will see it, including unsaved changes.'}
              </Dialog.Description>
            </div>
            <div className="gha-choice" role="group" aria-label="Device width">
              <button
                type="button"
                className="gha-btn gha-btn--sm gha-btn--ghost"
                aria-pressed={device === 'desktop'}
                style={device === 'desktop' ? { background: '#fff', boxShadow: '0 1px 2px rgba(18,41,32,.12)' } : undefined}
                onClick={() => setDevice('desktop')}
              >
                <Monitor size={15} aria-hidden />
                Desktop
              </button>
              <button
                type="button"
                className="gha-btn gha-btn--sm gha-btn--ghost"
                aria-pressed={device === 'mobile'}
                style={device === 'mobile' ? { background: '#fff', boxShadow: '0 1px 2px rgba(18,41,32,.12)' } : undefined}
                onClick={() => setDevice('mobile')}
              >
                <Smartphone size={15} aria-hidden />
                Mobile
              </button>
            </div>
            <a className="gha-btn gha-btn--secondary gha-btn--sm" href={url} target="_blank" rel="noreferrer">
              New tab
              <ArrowUpRight size={15} aria-hidden />
            </a>
            <Dialog.Close className="gha-btn gha-btn--ghost gha-btn--icon" aria-label="Close preview">
              <X size={18} aria-hidden />
            </Dialog.Close>
          </div>
          <div className="gha-preview-stage" data-device={device}>
            {open ? <iframe key={url} src={url} title="Public memo preview" /> : null}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
