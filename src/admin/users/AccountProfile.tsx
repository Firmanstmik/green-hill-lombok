import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { KeyRound, Loader2 } from '@/icons/iconsax';
import { useAdminPath } from '../paths';
import { Field } from '../ui/primitives';
import { LANGUAGES, useSaveProfile, useSelf } from './usersApi';

/** Your own name, language and password. Changing the password uses the normal update-password page. */
export function AccountProfile() {
  const self = useSelf();
  const save = useSaveProfile();
  const { site } = useAdminPath();
  const [fullName, setFullName] = useState('');
  const [language, setLanguage] = useState('en');

  useEffect(() => {
    if (!self) return;
    setFullName(self.fullName);
    setLanguage(self.preferredLanguage);
  }, [self]);

  if (!self) return null;
  const changed = fullName.trim() !== self.fullName || language !== self.preferredLanguage;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!changed || save.isPending) return;
    try {
      await save.mutateAsync({ id: self.id, fullName: fullName.trim(), language });
      toast.success('Your profile is saved.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Your profile could not be saved.');
    }
  };

  return (
    <section className="gha-section" aria-labelledby="gha-set-profile" style={{ marginTop: 0 }}>
      <div className="gha-section__head">
        <h2 className="gha-h2" id="gha-set-profile">
          Your profile
        </h2>
      </div>
      <form className="gha-panel gha-panel--pad gha-profile-form" onSubmit={(event) => void submit(event)} noValidate>
        <div className="gha-grid gha-grid--2">
          <Field label="Full name" hint="Shown in the navigation and on Users & Admins.">
            {(control) => (
              <input
                {...control}
                className="gha-input"
                autoComplete="name"
                maxLength={120}
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
              />
            )}
          </Field>
          <Field label="Preferred language">
            {(control) => (
              <select {...control} className="gha-select" value={language} onChange={(event) => setLanguage(event.target.value)}>
                {LANGUAGES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            )}
          </Field>
        </div>
        <Field label="Email" hint="The address you sign in with.">
          {(control) => <input {...control} className="gha-input" type="email" value={self.email} readOnly />}
        </Field>
        <div className="gha-profile-form__foot">
          <Link className="gha-btn gha-btn--secondary" to={site('/auth/update-password')}>
            <KeyRound size={16} aria-hidden />
            Change password
          </Link>
          <button type="submit" className="gha-btn gha-btn--primary" disabled={!changed || save.isPending}>
            {save.isPending ? <Loader2 size={16} className="gha-spin" aria-hidden /> : null}
            Save profile
          </button>
        </div>
      </form>
    </section>
  );
}
