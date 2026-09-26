import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Archive,
  ArchiveRestore,
  Copy,
  Eye,
  EyeOff,
  Lock,
  MoreHorizontal,
  Pencil,
  Send,
  Star,
  Trash2,
  Unlock,
} from 'lucide-react';
import { writeOpportunityPreview } from '@/lib/opportunityPreview';
import { teaserFromRow } from '@/lib/privateTeasers';
import { useRepository } from './AdminSession';
import { useDeleteDraft, useDerivedValues, useOpportunities, useSaveOpportunity } from './data/queries';
import { isPrivateRef } from './domain/media';
import { ConflictError } from './data/repository';
import {
  STATUS_LABEL,
  duplicateOpportunity,
  isLive,
  isReadyToPublish,
  nextReference,
  type Opportunity,
  type OpportunityStatus,
} from './domain/opportunity';
import { toRow } from './domain/opportunityRow';
import { useAdminPath } from './paths';
import { ActionMenu, ConfirmDialog, type MenuEntry } from './ui/overlays';

export function errorMessage(error: unknown, fallback = 'Something went wrong.'): string {
  if (error instanceof ConflictError) return error.message;
  return error instanceof Error && error.message ? error.message : fallback;
}

/**
 * Writes the record for the public memo's preview mode and returns the preview URL.
 * Private media is swapped for short-lived signed URLs that only this browser holds.
 */
export function usePreviewOpportunity() {
  const { site } = useAdminPath();
  const derive = useDerivedValues();
  const repository = useRepository();
  return useCallback(
    async (o: Opportunity) => {
      const key = o.id ?? 'unsaved';
      // Visitors never see "Draft" or "Archived": preview those as they would
      // appear once published (Available is the default publish status).
      const shown: Opportunity = isLive(o.status) ? o : { ...o, status: 'available' };
      const refs = [...shown.images, shown.ogImage].filter(isPrivateRef);
      const urls = refs.length ? await repository.resolveMedia(refs) : {};
      const swap = (value: string) => urls[value] ?? value;
      const viewable: Opportunity = {
        ...shown,
        images: shown.images.map(swap),
        imageAlt: Object.fromEntries(Object.entries(shown.imageAlt).map(([k, v]) => [swap(k), v])),
        ogImage: shown.ogImage ? swap(shown.ogImage) : shown.ogImage,
      };
      const row = { ...toRow(viewable, derive(viewable)), id: key, created_at: o.createdAt };
      // A Green Hill Private teaser previews exactly as visitors see it: disclosed fields only.
      if (o.visibility === 'private' && o.privateTeaser) {
        writeOpportunityPreview(key, teaserFromRow(row));
        return `${site(`/private/${key}`)}?preview=1`;
      }
      writeOpportunityPreview(key, row);
      return `${site(`/property/${key}`)}?preview=1`;
    },
    [derive, site, repository],
  );
}

type Pending =
  | { kind: 'status'; to: OpportunityStatus; title: string; text: string; confirm: string; danger?: boolean }
  | { kind: 'visibility'; to: 'public' | 'private'; title: string; text: string; confirm: string }
  | { kind: 'delete' }
  | null;

/** Row-level actions for an opportunity, used by the list, Private and Overview. */
export function OpportunityActions({ opportunity, compact }: { opportunity: Opportunity; compact?: boolean }) {
  const navigate = useNavigate();
  const { admin } = useAdminPath();
  const save = useSaveOpportunity();
  const remove = useDeleteDraft();
  const list = useOpportunities();
  const preview = usePreviewOpportunity();
  const [pending, setPending] = useState<Pending>(null);

  const o = opportunity;
  const live = isLive(o.status);

  const commit = async (next: Opportunity, success: string) => {
    try {
      await save.mutateAsync({ record: next, expectedUpdatedAt: o.updatedAt });
      toast.success(success);
      setPending(null);
    } catch (error) {
      toast.error(errorMessage(error, 'Could not update this opportunity.'));
    }
  };

  // Publishing always goes through the review step, so nothing goes live unseen.
  const publish = () => {
    if (!isReadyToPublish(o)) {
      toast.message('A few details are still missing', {
        description: 'Opening the review so you can see exactly what is needed.',
      });
    }
    navigate(`${admin(`/opportunities/${o.id}`)}?step=review`);
  };

  const duplicate = async () => {
    const refs = (list.data ?? []).map((item) => item.reference);
    try {
      const copy = await save.mutateAsync({
        record: duplicateOpportunity(o, nextReference(refs)),
        expectedUpdatedAt: null,
      });
      toast.success('Duplicated as a new draft.');
      navigate(admin(`/opportunities/${copy.id}`));
    } catch (error) {
      toast.error(errorMessage(error, 'Could not duplicate this opportunity.'));
    }
  };

  const entries: MenuEntry[] = [
    { kind: 'item', label: 'Edit', icon: <Pencil size={16} />, onSelect: () => navigate(admin(`/opportunities/${o.id}`)) },
    {
      kind: 'item',
      label: 'Preview',
      icon: <Eye size={16} />,
      onSelect: () => {
        // Open the tab first so it is not blocked as an unrequested pop-up.
        const tab = window.open('about:blank', '_blank');
        void preview(o)
          .then((url) => {
            if (!tab) return;
            tab.opener = null;
            tab.location.href = url;
          })
          .catch((error) => {
            tab?.close();
            toast.error(errorMessage(error, 'Could not open the preview.'));
          });
      },
    },
    { kind: 'item', label: 'Duplicate', icon: <Copy size={16} />, onSelect: () => void duplicate() },
    { kind: 'separator' },
  ];

  if (o.status === 'draft') {
    entries.push({ kind: 'item', label: 'Review & publish', icon: <Send size={16} />, onSelect: publish });
  }
  if (live) {
    (['available', 'reserved', 'sold'] as const)
      .filter((status) => status !== o.status)
      .forEach((status) =>
        entries.push({
          kind: 'item',
          label: `Mark as ${STATUS_LABEL[status].toLowerCase()}`,
          onSelect: () =>
            setPending({
              kind: 'status',
              to: status,
              title: `Mark as ${STATUS_LABEL[status].toLowerCase()}?`,
              text:
                o.visibility === 'public'
                  ? `The public memo will show “${STATUS_LABEL[status]}” straight away.`
                  : 'This private opportunity will show the new status in your Private workspace.',
              confirm: `Mark as ${STATUS_LABEL[status].toLowerCase()}`,
            }),
        }),
      );
    entries.push({
      kind: 'item',
      label: 'Unpublish (back to draft)',
      icon: <EyeOff size={16} />,
      onSelect: () =>
        setPending({
          kind: 'status',
          to: 'draft',
          title: 'Unpublish this opportunity?',
          text: 'It will be removed from the website and kept as a draft. Nothing is deleted.',
          confirm: 'Unpublish',
        }),
    });
  }

  if (o.status !== 'archived') {
    entries.push({
      kind: 'item',
      label: o.featured ? 'Remove from featured' : 'Feature on the homepage',
      icon: <Star size={16} />,
      onSelect: () =>
        void commit(
          { ...o, featured: !o.featured },
          o.featured ? 'No longer featured.' : 'Featured. It can now appear in the homepage selection.',
        ),
    });
    entries.push({
      kind: 'item',
      label: o.visibility === 'public' ? 'Move to private' : 'Make public',
      icon: o.visibility === 'public' ? <Lock size={16} /> : <Unlock size={16} />,
      onSelect: () =>
        setPending(
          o.visibility === 'public'
            ? {
                kind: 'visibility',
                to: 'private',
                title: 'Move to private?',
                text: 'It will disappear from the public website and only be handled directly through Green Hill.',
                confirm: 'Move to private',
              }
            : {
                kind: 'visibility',
                to: 'public',
                title: 'Make this opportunity public?',
                text: live
                  ? 'It will appear on the public website immediately.'
                  : 'It will appear on the public website once it is published.',
                confirm: 'Make public',
              },
        ),
    });
    entries.push({ kind: 'separator' });
    entries.push({
      kind: 'item',
      label: 'Archive opportunity',
      icon: <Archive size={16} />,
      onSelect: () =>
        setPending({
          kind: 'status',
          to: 'archived',
          title: 'Archive this opportunity?',
          text: 'It will be removed from the website and moved to Archived. You can restore it at any time.',
          confirm: 'Archive',
        }),
    });
  } else {
    entries.push({
      kind: 'item',
      label: 'Restore as draft',
      icon: <ArchiveRestore size={16} />,
      onSelect: () => void commit({ ...o, status: 'draft' }, 'Restored as a draft.'),
    });
  }

  if (o.status === 'draft') {
    entries.push({
      kind: 'item',
      label: 'Delete draft',
      icon: <Trash2 size={16} />,
      danger: true,
      onSelect: () => setPending({ kind: 'delete' }),
    });
  }

  const confirm = async () => {
    if (!pending) return;
    if (pending.kind === 'delete') {
      try {
        await remove.mutateAsync(o.id as string);
        toast.success('Draft deleted.');
        setPending(null);
      } catch (error) {
        toast.error(errorMessage(error, 'Could not delete this draft.'));
      }
      return;
    }
    if (pending.kind === 'status') {
      await commit({ ...o, status: pending.to }, `${STATUS_LABEL[pending.to]}.`);
      return;
    }
    await commit(
      { ...o, visibility: pending.to, featured: pending.to === 'private' ? false : o.featured },
      pending.to === 'private' ? 'Moved to private.' : 'Now public.',
    );
  };

  return (
    <>
      <ActionMenu
        label={`Actions for ${o.title || 'untitled opportunity'}`}
        entries={entries}
        trigger={
          <button type="button" className={`gha-btn gha-btn--ghost gha-btn--icon${compact ? ' gha-btn--sm' : ''}`}>
            <MoreHorizontal size={18} aria-hidden />
          </button>
        }
      />
      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(open) => !open && setPending(null)}
        title={pending?.kind === 'delete' ? 'Delete this draft?' : pending?.title ?? ''}
        description={
          pending?.kind === 'delete'
            ? `“${o.title || 'Untitled'}” has never been published. Deleting it cannot be undone.`
            : pending?.text ?? ''
        }
        confirmLabel={pending?.kind === 'delete' ? 'Delete draft' : pending?.confirm ?? 'Confirm'}
        tone={pending?.kind === 'delete' ? 'danger' : 'default'}
        busy={save.isPending || remove.isPending}
        onConfirm={() => void confirm()}
      />
    </>
  );
}
