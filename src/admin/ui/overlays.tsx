import type { ReactNode } from 'react';
import * as AlertDialog from '@radix-ui/react-alert-dialog';
import * as Dialog from '@radix-ui/react-dialog';
import * as Dropdown from '@radix-ui/react-dropdown-menu';
import { Loader2, X } from 'lucide-react';

/**
 * Radix primitives give focus trapping, Escape handling, aria-modal and
 * focus return. Portalled content carries `gha-portal` so it receives the
 * admin tokens even though it renders outside `.gh-admin`.
 */

type ConfirmProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: 'default' | 'danger';
  busy?: boolean;
  onConfirm: () => void;
};

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancel',
  tone = 'default',
  busy,
  onConfirm,
}: ConfirmProps) {
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="gha-overlay gha-portal" />
        <AlertDialog.Content className="gha-dialog gha-portal">
          <AlertDialog.Title className="gha-dialog__title">{title}</AlertDialog.Title>
          <AlertDialog.Description asChild>
            <div className="gha-dialog__text">{description}</div>
          </AlertDialog.Description>
          <div className="gha-dialog__foot">
            <AlertDialog.Cancel className="gha-btn gha-btn--secondary" disabled={busy}>
              {cancelLabel}
            </AlertDialog.Cancel>
            <button
              type="button"
              className={`gha-btn ${tone === 'danger' ? 'gha-btn--danger' : 'gha-btn--primary'}`}
              disabled={busy}
              onClick={onConfirm}
            >
              {busy ? <Loader2 size={16} className="gha-spin" aria-hidden /> : null}
              {confirmLabel}
            </button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

type ModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  wide?: boolean;
  hideHeader?: boolean;
};

export function Modal({ open, onOpenChange, title, description, children, wide, hideHeader }: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="gha-overlay gha-portal" />
        <Dialog.Content className={`gha-dialog gha-portal${wide ? ' gha-dialog--wide' : ''}`}>
          {hideHeader ? (
            <Dialog.Title className="gha-sr-only">{title}</Dialog.Title>
          ) : (
            <>
              <Dialog.Title className="gha-dialog__title">{title}</Dialog.Title>
              {description ? (
                <Dialog.Description className="gha-dialog__text">{description}</Dialog.Description>
              ) : null}
            </>
          )}
          {!description ? <Dialog.Description className="gha-sr-only">{title}</Dialog.Description> : null}
          {children}
          {!hideHeader ? (
            <Dialog.Close className="gha-btn gha-btn--ghost gha-btn--icon gha-dialog__close" aria-label="Close">
              <X size={18} aria-hidden />
            </Dialog.Close>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

type SheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  label: string;
  children: ReactNode;
};

/** Right-hand detail panel (full width on phones). */
export function Sheet({ open, onOpenChange, title, label, children }: SheetProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="gha-overlay gha-portal" />
        <Dialog.Content className="gha-sheet gha-portal" aria-label={label}>
          <div className="gha-sheet__head">
            <div style={{ flex: 1, minWidth: 0 }}>
              <Dialog.Title asChild>
                <div>{title}</div>
              </Dialog.Title>
            </div>
            <Dialog.Close className="gha-btn gha-btn--ghost gha-btn--icon" aria-label="Close">
              <X size={18} aria-hidden />
            </Dialog.Close>
          </div>
          <Dialog.Description className="gha-sr-only">{label}</Dialog.Description>
          <div className="gha-sheet__body">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export type MenuEntry =
  | { kind: 'item'; label: string; icon?: ReactNode; onSelect: () => void; danger?: boolean; disabled?: boolean }
  | { kind: 'separator' }
  | { kind: 'label'; label: string };

export function ActionMenu({ trigger, entries, label }: { trigger: ReactNode; entries: MenuEntry[]; label: string }) {
  return (
    <Dropdown.Root modal={false}>
      <Dropdown.Trigger asChild aria-label={label}>
        {trigger}
      </Dropdown.Trigger>
      <Dropdown.Portal>
        <Dropdown.Content className="gha-menu gha-portal" align="end" sideOffset={6} collisionPadding={12}>
          {entries.map((entry, index) =>
            entry.kind === 'separator' ? (
              <Dropdown.Separator key={index} className="gha-menu__sep" />
            ) : entry.kind === 'label' ? (
              <Dropdown.Label key={index} className="gha-menu__label">
                {entry.label}
              </Dropdown.Label>
            ) : (
              <Dropdown.Item
                key={index}
                className={`gha-menu__item${entry.danger ? ' gha-menu__item--danger' : ''}`}
                disabled={entry.disabled}
                onSelect={entry.onSelect}
              >
                {entry.icon}
                {entry.label}
              </Dropdown.Item>
            ),
          )}
        </Dropdown.Content>
      </Dropdown.Portal>
    </Dropdown.Root>
  );
}
