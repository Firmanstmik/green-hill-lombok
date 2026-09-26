import { DescriptionEditor } from '@/components/admin/DescriptionEditor';
import { CharCount, Field } from '../../ui/primitives';
import { StepFrame, type StepProps } from './shared';

export function StoryStep({ o, update }: StepProps) {
  return (
    <StepFrame
      number="05"
      title="Story"
      lead="The words on the memo. Describe what is there and why it is worth a conversation. Facts first, no promises of returns."
    >
      <div className="gha-field">
        <span className="gha-label" id="gha-desc-label">
          Main description <span className="gha-label__tag">Optional</span>
        </span>
        <p className="gha-hint" id="gha-desc-hint">
          The land, the setting, access and what is around it. Headings and short paragraphs read best.
        </p>
        <div className="gha-rich" role="group" aria-labelledby="gha-desc-label" aria-describedby="gha-desc-hint">
          <DescriptionEditor
            content={o.descriptionJson}
            onChange={(json) => update({ descriptionJson: json })}
            placeholder="Start with what the visitor would see when they arrive…"
          />
        </div>
      </div>

      <div style={{ marginTop: 28 }}>
        <Field
          label={o.visibility === 'private' ? 'Why Green Hill is looking at this (investment thesis)' : 'Why Green Hill likes it'}
          optional
          aside={<CharCount value={o.whyGreenHill} ideal={500} />}
          hint="In your own words, what caught your eye: the view, the access, the neighbours, the potential you would discuss in person. Keep it honest and specific."
        >
          {(control) => (
            <textarea
              {...control}
              className="gha-textarea"
              style={{ minHeight: 140 }}
              maxLength={1200}
              value={o.whyGreenHill}
              onChange={(event) => update({ whyGreenHill: event.target.value })}
            />
          )}
        </Field>
      </div>

      <div style={{ marginTop: 28 }}>
        <Field
          label="Development potential"
          optional
          aside={<CharCount value={o.developmentPotential} ideal={500} />}
          hint="Possible uses, e.g. boutique villas or a small resort. Shown with a note that concepts depend on zoning, planning, feasibility and professional advice."
        >
          {(control) => (
            <textarea
              {...control}
              className="gha-textarea"
              style={{ minHeight: 110 }}
              maxLength={1200}
              value={o.developmentPotential}
              onChange={(event) => update({ developmentPotential: event.target.value })}
            />
          )}
        </Field>
      </div>

      <div style={{ marginTop: 28 }}>
        <Field
          label="Known facts and what still needs verification"
          optional
          hint="Private notes for you and the investment memorandum (title, certificates, surveys, access). Never shown on the website."
        >
          {(control) => (
            <textarea
              {...control}
              className="gha-textarea"
              style={{ minHeight: 110 }}
              maxLength={2000}
              value={o.verificationNotes}
              onChange={(event) => update({ verificationNotes: event.target.value })}
            />
          )}
        </Field>
      </div>
    </StepFrame>
  );
}
