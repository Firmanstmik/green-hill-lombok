import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArchiveRestore, ArrowLeft, ArrowRight, Check, Eye, Loader2, RotateCcw, Send } from 'lucide-react';
import { useOpportunities, useOpportunity } from '../data/queries';
import {
  isLive,
  nextReference,
  optionalChecks,
  requiredChecks,
  type Check as ReadinessCheck,
  type Opportunity,
  type OpportunityStatus,
  type StepId,
} from '../domain/opportunity';
import { OpportunityActions, usePreviewOpportunity } from '../opportunityActions';
import { useAdminPath } from '../paths';
import { timeAgo } from '../ui/format';
import { ConfirmDialog } from '../ui/overlays';
import { EmptyState, ErrorState, StatusBadge, VisibilityBadge } from '../ui/primitives';
import { PreviewDialog } from './PreviewDialog';
import { BasicsStep } from './steps/BasicsStep';
import { LandStep } from './steps/LandStep';
import { LocationStep } from './steps/LocationStep';
import { MediaStep } from './steps/MediaStep';
import { ReviewStep } from './steps/ReviewStep';
import { SeoStep } from './steps/SeoStep';
import { StoryStep } from './steps/StoryStep';
import { clearBackup, readBackup, useOpportunityEditor, type SaveState } from './useOpportunityEditor';

const STEPS: { id: StepId; label: string; optional?: boolean }[] = [
  { id: 'basics', label: 'Basics' },
  { id: 'location', label: 'Location' },
  { id: 'specifications', label: 'Land & specifications', optional: true },
  { id: 'media', label: 'Media' },
  { id: 'story', label: 'Story', optional: true },
  { id: 'seo', label: 'Search & sharing', optional: true },
  { id: 'review', label: 'Review' },
];

type StepState = 'done' | 'todo' | 'optional' | 'none';

function stepStates(o: Opportunity): Record<StepId, StepState> {
  const req = requiredChecks(o);
  const opt = optionalChecks(o);
  const forStep = (step: StepId, list: ReadinessCheck[]) => list.filter((check) => check.step === step);
  const required = (step: StepId): StepState => (forStep(step, req).every((check) => check.done) ? 'done' : 'todo');
  const optional = (step: StepId): StepState => (forStep(step, opt).some((check) => check.done) ? 'done' : 'optional');
  return {
    basics: required('basics'),
    location: required('location'),
    specifications: optional('specifications'),
    media: required('media'),
    story: optional('story'),
    seo: optional('seo'),
    review: 'none',
  };
}

function isStep(value: string | null): value is StepId {
  return STEPS.some((step) => step.id === value);
}

/* ------------------------------------------------------------------ */

export default function OpportunityEditorPage() {
  const { id } = useParams();
  const list = useOpportunities();
  const loaded = useOpportunity(id ?? null);
  const { admin } = useAdminPath();

  const reference = useMemo(() => nextReference((list.data ?? []).map((item) => item.reference)), [list.data]);

  if (id && loaded.isLoading) {
    return (
      <div role="status" aria-live="polite" style={{ padding: '24px 0' }}>
        <span className="gha-skel" style={{ width: 320, height: 30 }} />
        <span className="gha-skel" style={{ width: 200, height: 14, marginTop: 12 }} />
        <span className="gha-sr-only">Loading opportunity…</span>
      </div>
    );
  }
  if (id && loaded.isError) {
    return <ErrorState message={(loaded.error as Error).message} onRetry={() => void loaded.refetch()} />;
  }
  if (id && !loaded.data) {
    return (
      <div className="gha-panel">
        <EmptyState
          title="This opportunity could not be found"
          text="It may have been deleted, or the link is incomplete."
          action={
            <Link className="gha-btn gha-btn--secondary" to={admin('/opportunities')}>
              Back to opportunities
            </Link>
          }
        />
      </div>
    );
  }
  if (!id && list.isLoading) {
    return (
      <div role="status" style={{ padding: '24px 0' }}>
        <span className="gha-skel" style={{ width: 320, height: 30 }} />
        <span className="gha-sr-only">Preparing a new opportunity…</span>
      </div>
    );
  }

  return <Editor key={id ?? 'new'} loaded={loaded.data ?? null} reference={reference} />;
}

/* ------------------------------------------------------------------ */

function saveLabel(state: SaveState, isDraft: boolean, isNew: boolean, now: number): string {
  switch (state.kind) {
    case 'new':
      return 'Not saved yet';
    case 'saving':
      return 'Saving…';
    case 'dirty':
      return isNew ? 'Not saved yet · kept on this device' : isDraft ? 'Unsaved changes · saving shortly' : 'Unsaved changes';
    case 'error':
      return state.conflict ? 'Changed elsewhere · not saved' : 'Couldn’t save';
    case 'saved':
      return `Saved ${timeAgo(state.at, now)}`;
  }
}

function Editor({ loaded, reference }: { loaded: Opportunity | null; reference: string }) {
  const navigate = useNavigate();
  const { admin } = useAdminPath();
  const [params, setParams] = useSearchParams();
  const editor = useOpportunityEditor(loaded, loaded ? '' : reference);
  const { record: o, update, persist, discard, restore, dirty, state, errors } = editor;
  const preview = usePreviewOpportunity();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const stageRef = useRef<HTMLDivElement>(null);

  const isNew = !o.id;
  const baselineStatus = editor.baseline.status;
  const live = isLive(baselineStatus);
  const isDraft = baselineStatus === 'draft';
  const archived = baselineStatus === 'archived';
  const step: StepId = isStep(params.get('step')) ? (params.get('step') as StepId) : 'basics';
  const stepIndex = STEPS.findIndex((item) => item.id === step);
  const states = useMemo(() => stepStates(o), [o]);

  // Offer (never force) a locally kept version of *this* record.
  const [backup] = useState(() => {
    const found = readBackup(loaded?.id ?? null);
    if (!found) return null;
    const base = loaded ?? null;
    if (base && JSON.stringify(found.record) === JSON.stringify(base)) return null;
    return found;
  });
  const [showRestore, setShowRestore] = useState(Boolean(backup));

  useEffect(() => {
    document.title = `${o.title || (isNew ? 'New opportunity' : 'Untitled')} · Green Hill Admin`;
  }, [o.title, isNew]);

  useEffect(() => {
    if (state.kind !== 'saved') return;
    const timer = window.setInterval(() => setNow(Date.now()), 10_000);
    return () => window.clearInterval(timer);
  }, [state.kind]);

  useEffect(() => setNow(Date.now()), [state]);

  const goTo = useCallback(
    (next: StepId) => {
      const nextParams = new URLSearchParams(params);
      nextParams.set('step', next);
      setParams(nextParams, { replace: true });
      window.requestAnimationFrame(() => {
        window.scrollTo({ top: 0 });
        document.getElementById('gha-stage-title')?.focus({ preventScroll: true });
      });
    },
    [params, setParams],
  );

  const save = useCallback(
    async (overrides?: Partial<Opportunity>) => {
      const saved = await persist(overrides);
      if (saved && isNew && saved.id) {
        navigate(`${admin(`/opportunities/${saved.id}`)}?step=${step}`, { replace: true });
      }
      return saved;
    },
    [persist, isNew, navigate, admin, step],
  );

  // Cmd/Ctrl + S saves.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        if (dirty || isNew) void save();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dirty, isNew, save]);

  const openPreview = () => {
    void preview(o)
      .then(setPreviewUrl)
      .catch((error) => toast.error(error instanceof Error ? error.message : 'Could not open the preview.'));
  };

  const publish = async (status: OpportunityStatus) => {
    setPublishing(true);
    const saved = await save({ status });
    setPublishing(false);
    if (saved) {
      toast.success(
        saved.visibility === 'private'
          ? 'Activated privately. It now appears in your Private workspace.'
          : 'Published. It is now on the website.',
      );
    } else {
      toast.error('Could not publish. Nothing has changed on the website.');
    }
  };

  const saveNow = async () => {
    const saved = await save();
    if (saved) toast.success(live ? 'Changes saved. The website is up to date.' : 'Draft saved.');
  };

  const back = () => {
    if (dirty && !(isDraft && !isNew)) {
      setLeaveOpen(true);
      return;
    }
    navigate(admin('/opportunities'));
  };

  const stepProps = { o, update, errors, goTo };
  const labelText = saveLabel(state, isDraft, isNew, now);
  const saveState =
    state.kind === 'saved' ? 'saved' : state.kind === 'saving' ? 'saving' : state.kind === 'error' ? 'error' : state.kind === 'new' ? 'new' : 'dirty';

  const stepButton = (item: (typeof STEPS)[number], index: number) => {
    const s = states[item.id];
    return (
      <button
        type="button"
        className="gha-step"
        aria-current={item.id === step ? 'step' : undefined}
        onClick={() => goTo(item.id)}
      >
        <span className="gha-step__num">{String(index + 1).padStart(2, '0')}</span>
        <span className="gha-step__label">
          {item.label}
          {item.optional ? <small>Optional</small> : null}
        </span>
        {s === 'none' ? (
          <span />
        ) : (
          <span className={`gha-step__state gha-step__state--${s}`} aria-hidden>
            {s === 'done' ? <Check size={11} strokeWidth={3} /> : null}
          </span>
        )}
        <span className="gha-sr-only">
          {s === 'done' ? ', complete' : s === 'todo' ? ', needs attention' : s === 'optional' ? ', optional' : ''}
        </span>
      </button>
    );
  };

  return (
    <div>
      <header className="gha-editor-head">
        <div className="gha-editor-head__row">
          <div className="gha-editor-head__id">
            <button type="button" className="gha-editor-head__back" onClick={back} style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer', font: 'inherit' }}>
              <ArrowLeft size={15} aria-hidden />
              Opportunities
            </button>
            <h1 className="gha-editor-head__title" data-empty={!o.title}>
              {o.title || (isNew ? 'New opportunity' : 'Untitled opportunity')}
            </h1>
            <div className="gha-editor-head__meta">
              {o.reference ? <span className="gha-meta gha-mono">{o.reference}</span> : null}
              <StatusBadge status={baselineStatus} />
              <VisibilityBadge visibility={o.visibility} teaser={o.privateTeaser} />
              <span className="gha-save" data-state={saveState} role="status" aria-live="polite">
                <span className="gha-save__dot" aria-hidden />
                {labelText}
              </span>
              {state.kind === 'error' && !state.conflict ? (
                <button type="button" className="gha-link" style={{ background: 'none', border: 0, cursor: 'pointer', font: 'inherit', fontSize: 13 }} onClick={() => void saveNow()}>
                  Retry
                </button>
              ) : null}
            </div>
          </div>

          <div className="gha-editor-head__actions">
            <button type="button" className="gha-btn gha-btn--secondary gha-hide-mobile" onClick={openPreview}>
              <Eye size={16} aria-hidden />
              Preview
            </button>

            {archived ? (
              <button
                type="button"
                className="gha-btn gha-btn--primary"
                onClick={() => void save({ status: 'draft' }).then((saved) => saved && toast.success('Restored as a draft.'))}
              >
                <ArchiveRestore size={16} aria-hidden />
                Restore as draft
              </button>
            ) : live ? (
              <>
                {dirty ? (
                  <button type="button" className="gha-btn gha-btn--ghost" onClick={discard}>
                    <RotateCcw size={16} aria-hidden />
                    Discard
                  </button>
                ) : null}
                <button
                  type="button"
                  className="gha-btn gha-btn--primary"
                  disabled={!dirty || state.kind === 'saving'}
                  onClick={() => void saveNow()}
                >
                  {state.kind === 'saving' ? <Loader2 size={16} className="gha-spin" aria-hidden /> : null}
                  {dirty ? 'Save changes' : 'Saved'}
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className={`gha-btn ${isNew ? 'gha-btn--primary' : 'gha-btn--secondary'}`}
                  disabled={(!dirty && !isNew) || state.kind === 'saving'}
                  onClick={() => void saveNow()}
                >
                  {state.kind === 'saving' ? <Loader2 size={16} className="gha-spin" aria-hidden /> : null}
                  {isNew || dirty ? 'Save draft' : 'Draft saved'}
                </button>
                {!isNew ? (
                  <button
                    type="button"
                    className="gha-btn gha-btn--primary"
                    onClick={() => goTo('review')}
                    aria-describedby="gha-publish-hint"
                  >
                    <Send size={16} aria-hidden />
                    Publish
                    <span id="gha-publish-hint" className="gha-sr-only">
                      Opens the review step
                    </span>
                  </button>
                ) : null}
              </>
            )}

            {!isNew && !dirty ? <OpportunityActions opportunity={editor.baseline} /> : null}
          </div>
        </div>
      </header>

      {showRestore && backup ? (
        <div className="gha-alert gha-alert--gold" role="region" aria-label="Unsaved work found" style={{ marginBottom: 20 }}>
          <div style={{ flex: 1 }}>
            <span className="gha-alert__title">Unsaved work found on this device</span>
            <span>
              {isNew ? 'A new opportunity' : 'Changes to this opportunity'} from {timeAgo(backup.at)} were not saved.
              {!isNew && backup.baseUpdatedAt !== loaded?.updatedAt
                ? ' The opportunity has been saved since, so restoring will replace those newer changes.'
                : ''}
            </span>
            <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
              <button
                type="button"
                className="gha-btn gha-btn--primary gha-btn--sm"
                onClick={() => {
                  restore(backup.record);
                  setShowRestore(false);
                  toast.success('Restored. Review it, then save.');
                }}
              >
                Restore
              </button>
              <button
                type="button"
                className="gha-btn gha-btn--secondary gha-btn--sm"
                onClick={() => {
                  clearBackup(loaded?.id ?? null);
                  setShowRestore(false);
                }}
              >
                Discard it
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {state.kind === 'error' && state.conflict ? (
        <div className="gha-alert" role="alert" style={{ marginBottom: 20 }}>
          <div>
            <span className="gha-alert__title">Not saved: this opportunity changed somewhere else</span>
            <span>
              To avoid overwriting those changes, nothing was saved. Your edits are kept on this device; reload to see
              the latest version, then restore your edits if you still need them.
            </span>
            <div style={{ marginTop: 12 }}>
              <button type="button" className="gha-btn gha-btn--secondary gha-btn--sm" onClick={() => window.location.reload()}>
                Reload
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {archived ? (
        <div className="gha-alert gha-alert--info" style={{ marginBottom: 20 }}>
          <div>
            <span className="gha-alert__title">Archived</span>
            <span>Not visible anywhere on the website. Restore it as a draft to publish it again.</span>
          </div>
        </div>
      ) : null}

      <div className="gha-editor">
        <nav aria-label="Editor steps">
          <ol className="gha-steps">
            {STEPS.map((item, index) => (
              <li key={item.id}>{stepButton(item, index)}</li>
            ))}
          </ol>
        </nav>

        <div ref={stageRef}>
          <div className="gha-stepper-mobile" role="navigation" aria-label="Editor steps">
            {STEPS.map((item, index) => (
              <span key={item.id}>{stepButton(item, index)}</span>
            ))}
          </div>

          {step === 'basics' ? <BasicsStep {...stepProps} /> : null}
          {step === 'location' ? <LocationStep {...stepProps} /> : null}
          {step === 'specifications' ? <LandStep {...stepProps} /> : null}
          {step === 'media' ? <MediaStep {...stepProps} /> : null}
          {step === 'story' ? <StoryStep {...stepProps} /> : null}
          {step === 'seo' ? <SeoStep {...stepProps} /> : null}
          {step === 'review' ? (
            <ReviewStep {...stepProps} onPublish={(status) => void publish(status)} onPreview={openPreview} publishing={publishing} />
          ) : null}

          <div className="gha-stage__nav">
            <button
              type="button"
              className="gha-btn gha-btn--secondary"
              disabled={stepIndex === 0}
              onClick={() => goTo(STEPS[Math.max(0, stepIndex - 1)].id)}
            >
              <ArrowLeft size={16} aria-hidden />
              Back
            </button>
            {stepIndex < STEPS.length - 1 ? (
              <button type="button" className="gha-btn gha-btn--primary" onClick={() => goTo(STEPS[stepIndex + 1].id)}>
                Next: {STEPS[stepIndex + 1].label}
                <ArrowRight size={16} aria-hidden />
              </button>
            ) : (
              <button type="button" className="gha-btn gha-btn--secondary" onClick={openPreview}>
                <Eye size={16} aria-hidden />
                Preview
              </button>
            )}
          </div>
        </div>
      </div>

      <PreviewDialog
        open={previewUrl !== null}
        onOpenChange={(open) => !open && setPreviewUrl(null)}
        url={previewUrl ?? ''}
        isPrivate={o.visibility === 'private'}
      />

      <ConfirmDialog
        open={leaveOpen}
        onOpenChange={setLeaveOpen}
        title="Leave without saving?"
        description={
          isNew
            ? 'This opportunity has not been saved. A copy stays on this device and will be offered next time you add an opportunity.'
            : 'Your changes are not on the website yet. A copy stays on this device and will be offered when you reopen this opportunity.'
        }
        cancelLabel="Keep editing"
        confirmLabel="Leave"
        onConfirm={() => {
          setLeaveOpen(false);
          navigate(admin('/opportunities'));
        }}
      />
    </div>
  );
}
