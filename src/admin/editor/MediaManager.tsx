import { useRef, useState } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useDropzone, type FileRejection } from 'react-dropzone';
import { toast } from 'sonner';
import { GripVertical, ImagePlus, Loader2, RefreshCw, Star, Trash2 } from '@/icons/iconsax';
import { useRepository } from '../AdminSession';
import { IMAGE_TYPES, MAX_IMAGE_BYTES } from '../data/repository';
import { MAX_IMAGES } from '../domain/opportunity';
import { Modal } from '../ui/overlays';
import { MediaImg } from '../ui/media';

type Props = {
  images: string[];
  imageAlt: Record<string, string>;
  onChange: (images: string[], imageAlt: Record<string, string>) => void;
  /** Live records must keep at least one photograph. */
  keepOne: boolean;
  title: string;
};

const ordinal = (index: number) => String(index + 1).padStart(2, '0');

export function MediaManager({ images, imageAlt, onChange, keepOne, title }: Props) {
  const repository = useRepository();
  const [progress, setProgress] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [viewing, setViewing] = useState<string | null>(null);
  const latest = useRef({ images, imageAlt });
  latest.current = { images, imageAlt };

  const room = MAX_IMAGES - images.length;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const label = (id: string | number) => {
    const index = latest.current.images.indexOf(String(id));
    return index === 0 ? 'the primary photograph' : `photograph ${ordinal(index)}`;
  };
  const announcements: Announcements = {
    onDragStart: ({ active }) => `Picked up ${label(active.id)}. Use the arrow keys to move it, space to drop.`,
    onDragOver: ({ active, over }) =>
      over ? `${label(active.id)} is over position ${ordinal(latest.current.images.indexOf(String(over.id)))}.` : '',
    onDragEnd: ({ active, over }) =>
      over
        ? `Dropped. It is now in position ${ordinal(latest.current.images.indexOf(String(over.id)))}${
            latest.current.images.indexOf(String(over.id)) === 0 ? ' and is the primary photograph' : ''
          }.`
        : `Dropped ${label(active.id)}.`,
    onDragCancel: ({ active }) => `Cancelled. ${label(active.id)} was not moved.`,
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = images.indexOf(String(active.id));
    const to = images.indexOf(String(over.id));
    onChange(arrayMove(images, from, to), imageAlt);
  };

  const upload = async (files: File[]) => {
    const batch = files.slice(0, Math.max(0, MAX_IMAGES - latest.current.images.length));
    if (files.length > batch.length) toast.error(`Up to ${MAX_IMAGES} photographs per opportunity.`);
    if (batch.length === 0) return;
    setBusy(true);
    let added = 0;
    for (const [index, file] of batch.entries()) {
      setProgress(`Uploading ${index + 1} of ${batch.length}…`);
      try {
        const url = await repository.uploadImage(file);
        const current = latest.current;
        if (!current.images.includes(url) && current.images.length < MAX_IMAGES) {
          onChange([...current.images, url], current.imageAlt);
          latest.current = { images: [...current.images, url], imageAlt: current.imageAlt };
          added += 1;
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : `Could not upload ${file.name}.`);
      }
    }
    setBusy(false);
    setProgress(added ? `${added === 1 ? 'Photograph' : `${added} photographs`} added.` : '');
  };

  const onDrop = (accepted: File[], rejected: FileRejection[]) => {
    if (rejected.length) toast.error('Use JPEG, PNG or WebP photographs under 25 MB.');
    if (accepted.length) void upload(accepted);
  };

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: Object.fromEntries(IMAGE_TYPES.map((type) => [type, []])),
    maxSize: MAX_IMAGE_BYTES,
    disabled: busy || room <= 0,
    noClick: true,
    noKeyboard: true,
  });

  const remove = (index: number) => {
    if (keepOne && images.length <= 1) {
      toast.error('A published opportunity needs at least one photograph. Add another before removing this one.');
      return;
    }
    const before = { images, imageAlt };
    const removed = images[index];
    const nextAlt = { ...imageAlt };
    delete nextAlt[removed];
    onChange(
      images.filter((_, i) => i !== index),
      nextAlt,
    );
    toast('Photograph removed.', {
      action: { label: 'Undo', onClick: () => onChange(before.images, before.imageAlt) },
    });
  };

  const replace = async (index: number, file: File) => {
    setBusy(true);
    setProgress('Replacing photograph…');
    try {
      const url = await repository.uploadImage(file);
      const current = latest.current;
      const old = current.images[index];
      const next = [...current.images];
      next[index] = url;
      const nextAlt = { ...current.imageAlt };
      if (old && nextAlt[old]) {
        nextAlt[url] = nextAlt[old];
        delete nextAlt[old];
      }
      onChange(next, nextAlt);
      setProgress('Photograph replaced.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not replace this photograph.');
      setProgress('');
    } finally {
      setBusy(false);
    }
  };

  const makePrimary = (index: number) => {
    onChange(arrayMove(images, index, 0), imageAlt);
    setProgress(`Photograph ${ordinal(index)} is now the primary photograph.`);
  };

  const setAlt = (url: string, text: string) => {
    onChange(images, { ...imageAlt, [url]: text });
  };

  return (
    <div>
      <div className="gha-field__row" style={{ marginBottom: 12, alignItems: 'baseline' }}>
        <span className="gha-label">
          Photographs <span className="gha-label__tag gha-label__tag--req">1 required</span>
        </span>
        <span className="gha-count" aria-live="polite">
          {images.length} of {MAX_IMAGES}
        </span>
      </div>

      <div
        {...getRootProps({
          className: 'gha-dropzone',
          'data-active': isDragActive ? 'true' : 'false',
          'aria-disabled': room <= 0 || busy ? 'true' : undefined,
        })}
      >
        <input {...getInputProps({ 'aria-label': 'Upload photographs' })} />
        {busy ? <Loader2 size={22} className="gha-spin" aria-hidden /> : <ImagePlus size={22} aria-hidden color="var(--gha-forest)" />}
        <span className="gha-dropzone__title">
          {room <= 0 ? 'The gallery is full' : isDragActive ? 'Drop to add' : 'Drag photographs here'}
        </span>
        <span className="gha-hint">
          {room <= 0
            ? `Remove one to add another. ${MAX_IMAGES} is the maximum.`
            : `JPEG, PNG or WebP. Up to ${room} more. They are resized and optimised for you.`}
        </span>
        {room > 0 ? (
          <button type="button" className="gha-btn gha-btn--secondary gha-btn--sm" onClick={open} disabled={busy}>
            Choose photographs
          </button>
        ) : null}
      </div>

      <p className="gha-sr-only" role="status" aria-live="polite">
        {progress}
      </p>
      {progress && busy ? (
        <p className="gha-hint" style={{ marginTop: 8 }} aria-hidden>
          {progress}
        </p>
      ) : null}

      {images.length > 0 ? (
        <>
          <p className="gha-hint" style={{ margin: '16px 0 12px' }} id="gha-reorder-help">
            The first photograph is the primary one: the hero on the memo and the image on cards. Drag the handle to
            reorder, or focus it and use Space and the arrow keys.
          </p>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
            accessibility={{
              announcements,
              screenReaderInstructions: {
                draggable:
                  'To reorder, press Space to pick up the photograph, use the arrow keys to move it, then Space to drop or Escape to cancel.',
              },
            }}
          >
            <SortableContext items={images} strategy={rectSortingStrategy}>
              <ul className="gha-media" aria-label="Gallery order">
                {images.map((url, index) => (
                  <MediaTile
                    key={url}
                    url={url}
                    index={index}
                    alt={imageAlt[url] ?? ''}
                    title={title}
                    disabled={busy}
                    onAlt={(text) => setAlt(url, text)}
                    onRemove={() => remove(index)}
                    onReplace={(file) => void replace(index, file)}
                    onPrimary={() => makePrimary(index)}
                    onView={() => setViewing(url)}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        </>
      ) : null}

      <Modal open={viewing !== null} onOpenChange={(value) => !value && setViewing(null)} title="Photograph">
        {viewing ? (
          <MediaImg
            src={viewing}
            alt={imageAlt[viewing] || ''}
            style={{ width: '100%', borderRadius: 8, marginTop: 16, display: 'block' }}
          />
        ) : null}
      </Modal>
    </div>
  );
}

type TileProps = {
  url: string;
  index: number;
  alt: string;
  title: string;
  disabled: boolean;
  onAlt: (text: string) => void;
  onRemove: () => void;
  onReplace: (file: File) => void;
  onPrimary: () => void;
  onView: () => void;
};

function MediaTile({ url, index, alt, title, disabled, onAlt, onRemove, onReplace, onPrimary, onView }: TileProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: url });
  const primary = index === 0;
  const number = ordinal(index);
  const altId = `gha-alt-${index}`;

  return (
    <li
      ref={setNodeRef}
      className="gha-tile"
      data-primary={primary}
      data-dragging={isDragging}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <div className="gha-tile__img">
        <button
          type="button"
          onClick={onView}
          style={{ position: 'absolute', inset: 0, border: 0, padding: 0, background: 'none', cursor: 'zoom-in' }}
          aria-label={`View photograph ${number} larger`}
        >
          <MediaImg src={url} alt="" loading="lazy" decoding="async" />
        </button>
        <span className="gha-tile__badge" aria-hidden>
          {primary ? <span className="gha-tile__primary">Primary</span> : <span>{number}</span>}
        </span>
        <button
          type="button"
          className="gha-tile__grip"
          aria-label={`Reorder ${primary ? 'the primary photograph' : `photograph ${number}`}`}
          aria-describedby="gha-reorder-help"
          {...attributes}
          {...listeners}
        >
          <GripVertical size={18} aria-hidden />
        </button>
      </div>
      <div className="gha-tile__body">
        <span className="gha-tile__caption">{primary ? 'Main hero image' : `Gallery photograph ${number}`}</span>
        <div className="gha-field">
          <label className="gha-label" htmlFor={altId} style={{ fontSize: 12.5 }}>
            Description <span className="gha-label__tag">For screen readers</span>
          </label>
          <input
            id={altId}
            className="gha-input"
            placeholder={primary ? title || 'What the photograph shows' : 'What the photograph shows'}
            value={alt}
            maxLength={160}
            onChange={(event) => onAlt(event.target.value)}
          />
        </div>
        <div className="gha-tile__actions">
          {!primary ? (
            <button type="button" className="gha-btn gha-btn--secondary gha-btn--sm" onClick={onPrimary} disabled={disabled}>
              <Star size={14} aria-hidden />
              Make primary
            </button>
          ) : null}
          <button
            type="button"
            className="gha-btn gha-btn--secondary gha-btn--sm"
            onClick={() => fileRef.current?.click()}
            disabled={disabled}
          >
            <RefreshCw size={14} aria-hidden />
            Replace
          </button>
          <button
            type="button"
            className="gha-btn gha-btn--danger gha-btn--sm gha-btn--icon"
            onClick={onRemove}
            disabled={disabled}
            aria-label={`Remove photograph ${number}`}
          >
            <Trash2 size={15} aria-hidden />
          </button>
          <input
            ref={fileRef}
            type="file"
            accept={IMAGE_TYPES.join(',')}
            className="gha-sr-only"
            tabIndex={-1}
            aria-hidden
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (file) onReplace(file);
            }}
          />
        </div>
      </div>
    </li>
  );
}
