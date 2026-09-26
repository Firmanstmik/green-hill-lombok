import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { GhIconArrow } from '@/components/brand/GhIcons';
import { useLanguage } from '@/contexts/LanguageContext';
import { trackContact, trackLead } from '@/lib/analytics';
import { getContact, getPublicWhatsAppUrl } from '@/lib/contact';
import { recordEnquiry } from '@/lib/enquiries';
import {
  BUDGET_BANDS,
  CAPITAL_BANDS,
  INTERESTS,
  INVESTOR_TYPES,
  OBJECTIVES,
  PRIVATE_INTERESTS,
  TIMEFRAMES,
  type Option,
} from '@/lib/investorProfile';

/**
 * Investor profile (brief §9) and Green Hill Private qualification (brief §21).
 * The enquiry is recorded for the admin, then the conversation continues on
 * WhatsApp with a summary Reece can read at a glance. Recording never blocks
 * the visitor: if it fails, WhatsApp still opens.
 */
export type EnquiryOpportunity = { id: string | null; title: string; reference?: string };

type Variant = 'standard' | 'private';

type FormState = {
  name: string;
  email: string;
  whatsapp: string;
  country: string;
  company: string;
  budget: string;
  investorType: string;
  interests: string[];
  objective: string;
  timeframe: string;
  message: string;
};

const EMPTY: FormState = {
  name: '',
  email: '',
  whatsapp: '',
  country: '',
  company: '',
  budget: '',
  investorType: '',
  interests: [],
  objective: '',
  timeframe: '',
  message: '',
};

type Errors = Partial<Record<'name' | 'contact' | 'email', string>>;

export function InvestorProfileForm({
  variant,
  opportunity,
  preset,
}: {
  variant: Variant;
  opportunity?: EnquiryOpportunity | null;
  /** Pre-select an interest (e.g. from a prompt elsewhere on the page); `n` changes on every request. */
  preset?: { interest: string | null; n: number };
}) {
  const { t } = useLanguage();
  const uid = useId().replace(/:/g, '');
  const formRef = useRef<HTMLFormElement>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [sent, setSent] = useState<'whatsapp' | 'email' | null>(null);
  const isPrivate = variant === 'private';
  const whatsappUrl = getPublicWhatsAppUrl();

  useEffect(() => {
    const interest = preset?.interest;
    if (!interest) return;
    setForm((current) =>
      current.interests.includes(interest) ? current : { ...current, interests: [...current.interests, interest] },
    );
  }, [preset?.n, preset?.interest]);

  const set = (key: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
    setSent(null);
  };

  const toggleInterest = (value: string) => {
    setForm((current) => ({
      ...current,
      interests: current.interests.includes(value)
        ? current.interests.filter((item) => item !== value)
        : [...current.interests, value],
    }));
    setSent(null);
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const name = form.name.trim();
    const email = form.email.trim();
    const whatsapp = form.whatsapp.trim();
    const next: Errors = {};
    if (!name) next.name = t('enquiry.form.errors.name');
    if (!email && !whatsapp) next.contact = t('enquiry.form.errors.contact');
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = t('enquiry.form.errors.email');
    if (Object.keys(next).length > 0) {
      setErrors(next);
      window.requestAnimationFrame(() => {
        formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
      });
      return;
    }
    setErrors({});

    const source = isPrivate ? 'private' : opportunity?.id ? 'opportunity' : 'general';
    void recordEnquiry({
      name,
      email: email || undefined,
      whatsapp: whatsapp || undefined,
      country: form.country.trim() || undefined,
      message: form.message.trim() || undefined,
      source,
      opportunityId: opportunity?.id ?? null,
      enquiryType: isPrivate ? 'Investment memorandum request' : 'Investor profile',
      company: isPrivate ? form.company.trim() || undefined : undefined,
      budget: form.budget || undefined,
      investorType: isPrivate ? form.investorType || undefined : undefined,
      interests: form.interests,
      objective: isPrivate ? undefined : form.objective || undefined,
      timeframe: form.timeframe || undefined,
    });
    trackLead({ form: isPrivate ? 'private' : 'investor', opportunity: opportunity?.reference || opportunity?.title });

    // Written for Reece, in English, so every lead reads the same way.
    const about = opportunity ? `${opportunity.title}${opportunity.reference ? ` (${opportunity.reference})` : ''}` : '';
    const lines = [
      isPrivate ? 'Green Hill Private — investment memorandum request' : 'Green Hill investor enquiry',
      about ? `Opportunity: ${about}` : '',
      `Name: ${name}`,
      isPrivate && form.company.trim() ? `Company: ${form.company.trim()}` : '',
      form.country.trim() ? `Country: ${form.country.trim()}` : '',
      `Email: ${email || 'not provided'}`,
      `WhatsApp: ${whatsapp || 'not provided'}`,
      form.budget ? `${isPrivate ? 'Capital available' : 'Budget'}: ${form.budget}` : '',
      isPrivate && form.investorType ? `Investor type: ${form.investorType}` : '',
      form.interests.length ? `Interests: ${form.interests.join(', ')}` : '',
      !isPrivate && form.objective ? `Main objective: ${form.objective}` : '',
      form.timeframe ? `Timeframe: ${form.timeframe}` : '',
      form.message.trim() ? `\n${form.message.trim()}` : '',
    ].filter(Boolean);
    const text = encodeURIComponent(lines.join('\n'));

    if (whatsappUrl) {
      trackContact({ channel: 'whatsapp', form: isPrivate ? 'private' : 'investor' });
      window.open(`${whatsappUrl}?text=${text}`, '_blank', 'noopener,noreferrer');
      setSent('whatsapp');
      return;
    }
    trackContact({ channel: 'email', form: isPrivate ? 'private' : 'investor' });
    window.location.href = `mailto:${getContact().email}?subject=${encodeURIComponent(lines[0])}&body=${text}`;
    setSent('email');
  };

  const select = (key: 'budget' | 'investorType' | 'objective' | 'timeframe', label: string, options: Option[]) => (
    <label className="gh-priv-field">
      <span className="gh-priv-field__label">{label}</span>
      <select name={key} value={form[key]} onChange={(event) => set(key, event.target.value)}>
        <option value="">{t('enquiry.form.choose')}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {t(option.key)}
          </option>
        ))}
      </select>
    </label>
  );

  const interestOptions = isPrivate ? PRIVATE_INTERESTS : INTERESTS;

  return (
    <form ref={formRef} className="gh-priv-form" onSubmit={onSubmit} noValidate>
      {opportunity ? (
        <p className="gh-priv-field gh-priv-field--full gh-enquiry-about">
          <span className="gh-priv-field__label">{t('enquiry.form.about')}</span>
          <span className="gh-enquiry-about__title">
            {opportunity.title}
            {opportunity.reference ? <span className="gh-enquiry-about__ref"> · {opportunity.reference}</span> : null}
          </span>
        </p>
      ) : null}

      <label className="gh-priv-field gh-priv-field--full">
        <span className="gh-priv-field__label">{t('enquiry.form.name')}</span>
        <input
          name="name"
          autoComplete="name"
          placeholder={t('enquiry.form.namePlaceholder')}
          value={form.name}
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? `${uid}-name-error` : undefined}
          onChange={(event) => {
            set('name', event.target.value);
            setErrors((current) => ({ ...current, name: undefined }));
          }}
        />
        {errors.name ? (
          <span id={`${uid}-name-error`} className="gh-priv-field__error" role="alert">
            {errors.name}
          </span>
        ) : null}
      </label>

      {isPrivate ? (
        <label className="gh-priv-field gh-priv-field--full">
          <span className="gh-priv-field__label">{t('enquiry.form.company')}</span>
          <input
            name="company"
            autoComplete="organization"
            placeholder={t('enquiry.form.companyPlaceholder')}
            value={form.company}
            onChange={(event) => set('company', event.target.value)}
          />
        </label>
      ) : null}

      <label className="gh-priv-field">
        <span className="gh-priv-field__label">{t('enquiry.form.email')}</span>
        <input
          type="email"
          name="email"
          autoComplete="email"
          placeholder={t('enquiry.form.emailPlaceholder')}
          value={form.email}
          aria-invalid={Boolean(errors.email || errors.contact)}
          aria-describedby={errors.email ? `${uid}-email-error` : errors.contact ? `${uid}-contact-error` : undefined}
          onChange={(event) => {
            set('email', event.target.value);
            setErrors((current) => ({ ...current, email: undefined, contact: undefined }));
          }}
        />
        {errors.email ? (
          <span id={`${uid}-email-error`} className="gh-priv-field__error" role="alert">
            {errors.email}
          </span>
        ) : null}
      </label>

      <label className="gh-priv-field">
        <span className="gh-priv-field__label">{t('enquiry.form.whatsapp')}</span>
        <input
          name="whatsapp"
          autoComplete="tel"
          inputMode="tel"
          placeholder={t('enquiry.form.whatsappPlaceholder')}
          value={form.whatsapp}
          aria-invalid={Boolean(errors.contact)}
          aria-describedby={errors.contact ? `${uid}-contact-error` : undefined}
          onChange={(event) => {
            set('whatsapp', event.target.value);
            setErrors((current) => ({ ...current, contact: undefined }));
          }}
        />
        {errors.contact ? (
          <span id={`${uid}-contact-error`} className="gh-priv-field__error" role="alert">
            {errors.contact}
          </span>
        ) : null}
      </label>

      <label className="gh-priv-field">
        <span className="gh-priv-field__label">{t('enquiry.form.country')}</span>
        <input
          name="country"
          autoComplete="country-name"
          placeholder={t('enquiry.form.countryPlaceholder')}
          value={form.country}
          onChange={(event) => set('country', event.target.value)}
        />
      </label>

      {isPrivate
        ? select('budget', t('enquiry.form.capital'), CAPITAL_BANDS)
        : select('budget', t('enquiry.form.budget'), BUDGET_BANDS)}

      {isPrivate ? select('investorType', t('enquiry.form.investorType'), INVESTOR_TYPES) : null}
      {!isPrivate ? select('objective', t('enquiry.form.objective'), OBJECTIVES) : null}
      {select('timeframe', t('enquiry.form.timeframe'), TIMEFRAMES)}

      <fieldset className="gh-priv-field gh-priv-field--full gh-priv-type">
        <legend className="gh-priv-field__label">{t(isPrivate ? 'enquiry.form.privateInterests' : 'enquiry.form.interests')}</legend>
        <div className="gh-priv-type__options">
          {interestOptions.map((option) => {
            const on = form.interests.includes(option.value);
            return (
              <button
                key={option.value}
                type="button"
                role="checkbox"
                aria-checked={on}
                className={on ? 'is-selected' : ''}
                onClick={() => toggleInterest(option.value)}
              >
                <span>{t(option.key)}</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <label className="gh-priv-field gh-priv-field--full gh-priv-form__message">
        <span className="gh-priv-field__label">{t('enquiry.form.message')}</span>
        <textarea
          name="message"
          rows={5}
          placeholder={t(isPrivate ? 'enquiry.form.privateMessagePlaceholder' : 'enquiry.form.messagePlaceholder')}
          value={form.message}
          onChange={(event) => set('message', event.target.value)}
        />
      </label>

      <div className="gh-priv-form__submit">
        <button type="submit" className="gh-final__cta gh-final__cta--primary gh-priv-cta--ink">
          <span className="gh-final__cta-label">
            {t(isPrivate ? 'enquiry.form.submitPrivate' : 'enquiry.form.submit')}
          </span>
          <GhIconArrow size={15} aria-hidden />
        </button>
        <p className="gh-priv-form__hint gh-enquiry-note">{t('enquiry.form.privacy')}</p>
        {sent ? (
          <p className="gh-priv-form__hint" role="status">
            {t(sent === 'whatsapp' ? 'enquiry.form.sentWhatsapp' : 'enquiry.form.sentEmail')}
          </p>
        ) : null}
      </div>
    </form>
  );
}
