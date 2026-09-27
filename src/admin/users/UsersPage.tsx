import { useEffect, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { KeyRound, Loader2, Pencil, Plus } from '@/icons/iconsax';
import { useAdminSession } from '../AdminSession';
import { isValidEmail } from '../auth/authMessages';
import { ConfirmDialog, Modal } from '../ui/overlays';
import { EmptyState, ErrorState, Field, PageHead, SkeletonRows } from '../ui/primitives';
import { timeAgo } from '../ui/format';
import {
  LANGUAGES,
  STATUS_LABEL,
  displayName,
  initials,
  useAdminUsers,
  useInviteAdmin,
  useSaveProfile,
  useSetAccess,
  userStatus,
  type AdminUser,
} from './usersApi';

function lastActivity(user: AdminUser): string {
  if (user.lastSignInAt) return `Signed in ${timeAgo(user.lastSignInAt)}`;
  if (userStatus(user) === 'invited' && user.invitedAt) return `Invited ${timeAgo(user.invitedAt)}`;
  return 'Not signed in yet';
}

function StatusMark({ user }: { user: AdminUser }) {
  const status = userStatus(user);
  return (
    <span className="gha-user-status" data-status={status}>
      <span className="gha-user-status__dot" aria-hidden />
      {STATUS_LABEL[status]}
    </span>
  );
}

function Person({ user }: { user: AdminUser }) {
  return (
    <span className="gha-person">
      <span className="gha-person__avatar" data-self={user.isSelf || undefined} aria-hidden>
        {initials(user)}
      </span>
      <span className="gha-person__text">
        <span className="gha-person__name">
          {user.fullName || <span className="gha-person__unset">Name not set</span>}
          {user.isSelf ? <span className="gha-person__you">You</span> : null}
        </span>
        <span className="gha-person__email">{user.email}</span>
      </span>
    </span>
  );
}

export function UsersPage() {
  const { isLocalPreview, sendPasswordReset } = useAdminSession();
  const users = useAdminUsers();
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [resetting, setResetting] = useState<AdminUser | null>(null);
  const [resetBusy, setResetBusy] = useState(false);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    document.title = 'Users & Admins · Green Hill Admin';
  }, []);

  const sendReset = async () => {
    if (!resetting) return;
    setResetBusy(true);
    try {
      await sendPasswordReset(resetting.email);
      toast.success('Password reset email sent.');
      setResetting(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'The reset email could not be sent. Please try again.');
    } finally {
      setResetBusy(false);
    }
  };

  const actions = (user: AdminUser) => (
    <div className="gha-user-actions">
      <button type="button" className="gha-btn gha-btn--secondary gha-btn--sm" onClick={() => setEditing(user)}>
        <Pencil size={15} aria-hidden />
        Edit
        <span className="gha-sr-only"> {displayName(user)}</span>
      </button>
      <button type="button" className="gha-btn gha-btn--ghost gha-btn--sm" onClick={() => setResetting(user)}>
        <KeyRound size={15} aria-hidden />
        Reset password
        <span className="gha-sr-only"> for {displayName(user)}</span>
      </button>
    </div>
  );

  return (
    <div className="gha-enter">
      <PageHead
        eyebrow="Relationships"
        title="Users & Admins"
        lead="The people who can sign in to Green Hill Admin. Each person has their own account, and every admin can manage everything."
        actions={
          isLocalPreview ? null : (
            <button type="button" className="gha-btn gha-btn--primary" onClick={() => setAdding(true)}>
              <Plus size={16} aria-hidden />
              Add admin
            </button>
          )
        }
      />

      {isLocalPreview ? (
        <EmptyState
          title="Available in the live admin"
          text="Accounts live in the Green Hill database, which this local preview does not connect to."
        />
      ) : users.isLoading ? (
        <SkeletonRows rows={2} label="Loading users" />
      ) : users.isError ? (
        <ErrorState message={(users.error as Error).message} onRetry={() => void users.refetch()} />
      ) : (
        <>
          <div className="gha-panel gha-users-table">
            <table className="gha-table">
              <caption className="gha-sr-only">People who can sign in to Green Hill Admin</caption>
              <thead>
                <tr>
                  <th scope="col">User</th>
                  <th scope="col">Role</th>
                  <th scope="col">Status</th>
                  <th scope="col">Last activity</th>
                  <th scope="col" className="gha-table__actions">
                    <span className="gha-sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {(users.data ?? []).map((user) => (
                  <tr key={user.id}>
                    <td>
                      <Person user={user} />
                    </td>
                    <td>{user.isAdmin ? <span className="gha-role">Admin</span> : <span className="gha-meta">—</span>}</td>
                    <td>
                      <StatusMark user={user} />
                    </td>
                    <td className="gha-meta">{lastActivity(user)}</td>
                    <td className="gha-table__actions">{actions(user)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="gha-user-cards" aria-label="People who can sign in to Green Hill Admin">
            {(users.data ?? []).map((user) => (
              <li key={user.id} className="gha-user-card">
                <Person user={user} />
                <div className="gha-user-card__meta">
                  {user.isAdmin ? <span className="gha-role">Admin</span> : null}
                  <StatusMark user={user} />
                </div>
                <p className="gha-user-card__activity">{lastActivity(user)}</p>
                {actions(user)}
              </li>
            ))}
          </ul>
        </>
      )}

      {editing ? <EditUserDialog user={editing} onClose={() => setEditing(null)} /> : null}

      <ConfirmDialog
        open={Boolean(resetting)}
        onOpenChange={(open) => (open ? null : setResetting(null))}
        title="Reset password?"
        description={
          <>
            A password reset link will be sent to <strong>{resetting?.email}</strong>. They will choose their own new
            password; nobody else ever sees it.
          </>
        }
        confirmLabel="Send reset link"
        busy={resetBusy}
        onConfirm={() => void sendReset()}
      />

      {adding ? <AddAdminDialog onClose={() => setAdding(false)} /> : null}
    </div>
  );
}

function EditUserDialog({ user, onClose }: { user: AdminUser; onClose: () => void }) {
  const save = useSaveProfile();
  const setAccess = useSetAccess();
  const [fullName, setFullName] = useState(user.fullName);
  const [language, setLanguage] = useState(user.preferredLanguage);
  const [access, setAccessValue] = useState(user.isAdmin);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [error, setError] = useState('');
  const busy = save.isPending || setAccess.isPending;

  const apply = async () => {
    setError('');
    try {
      if (fullName.trim() !== user.fullName || language !== user.preferredLanguage) {
        await save.mutateAsync({ id: user.id, fullName: fullName.trim(), language });
      }
      if (access !== user.isAdmin) await setAccess.mutateAsync({ id: user.id, enabled: access });
      toast.success(access === user.isAdmin ? 'Changes saved.' : access ? 'Admin access given.' : 'Admin access removed.');
      onClose();
    } catch (err) {
      setConfirmRemove(false);
      setError(err instanceof Error ? err.message : 'The changes could not be saved.');
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    if (user.isAdmin && !access) setConfirmRemove(true);
    else void apply();
  };

  return (
    <>
      <Modal open onOpenChange={(open) => (open ? null : onClose())} title={user.isAdmin ? 'Edit admin' : 'Edit user'}>
        <form className="gha-user-form" onSubmit={submit} noValidate>
          <Field label="Full name" optional>
            {(control) => (
              <input
                {...control}
                className="gha-input"
                autoComplete="off"
                maxLength={120}
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
              />
            )}
          </Field>
          <Field
            label="Email"
            hint="Email addresses can’t be changed here. To use a different address, add it as a new admin, then remove access from this one."
          >
            {(control) => <input {...control} className="gha-input" type="email" value={user.email} readOnly />}
          </Field>
          <Field label="Preferred language" hint="Kept on the profile. The admin itself is in English.">
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
          <div className="gha-field">
            <span className="gha-label" id="gha-access-label">
              Admin access
            </span>
            <label className="gha-switch">
              <input
                type="checkbox"
                aria-labelledby="gha-access-label"
                aria-describedby="gha-access-hint"
                checked={access}
                disabled={user.isSelf}
                onChange={(event) => setAccessValue(event.target.checked)}
              />
              <span className="gha-switch__track" aria-hidden />
              {access ? 'Enabled' : 'No access'}
            </label>
            <p className="gha-hint" id="gha-access-hint">
              {user.isSelf
                ? 'You can’t remove your own access. Another admin can do this for you.'
                : 'Admins can manage everything in Green Hill Admin. Removing access keeps the account but closes the admin to it.'}
            </p>
          </div>

          {error ? (
            <div className="gha-alert" role="alert">
              <div>{error}</div>
            </div>
          ) : null}

          <div className="gha-dialog__foot">
            <button type="button" className="gha-btn gha-btn--secondary" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <button type="submit" className="gha-btn gha-btn--primary" disabled={busy}>
              {busy ? <Loader2 size={16} className="gha-spin" aria-hidden /> : null}
              Save changes
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={confirmRemove}
        onOpenChange={setConfirmRemove}
        title="Remove admin access?"
        description={
          <>
            <strong>{displayName(user)}</strong> will no longer be able to open Green Hill Admin. Their account is kept,
            and access can be given back at any time.
          </>
        }
        confirmLabel="Remove access"
        tone="danger"
        busy={busy}
        onConfirm={() => void apply()}
      />
    </>
  );
}

function AddAdminDialog({ onClose }: { onClose: () => void }) {
  const invite = useInviteAdmin();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [language, setLanguage] = useState('en');
  const [emailError, setEmailError] = useState('');
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (invite.isPending) return;
    setResult(null);
    if (!isValidEmail(email)) {
      setEmailError('Please enter a valid email address.');
      return;
    }
    setEmailError('');
    const outcome = await invite.mutateAsync({ email: email.trim(), fullName: fullName.trim(), language });
    if (outcome.ok) {
      toast.success(outcome.message);
      onClose();
    } else {
      setResult(outcome);
    }
  };

  return (
    <Modal
      open
      onOpenChange={(open) => (open ? null : onClose())}
      title="Add admin"
      description="They’ll receive an email invitation and choose their own password. Nobody else ever sees it."
    >
      <form className="gha-user-form" onSubmit={(event) => void submit(event)} noValidate>
        <Field label="Full name" optional>
          {(control) => (
            <input
              {...control}
              className="gha-input"
              autoComplete="off"
              maxLength={120}
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
            />
          )}
        </Field>
        <Field label="Email" required error={emailError || undefined}>
          {(control) => (
            <input
              {...control}
              className="gha-input"
              type="email"
              inputMode="email"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setEmailError('');
              }}
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
        <div className="gha-field">
          <span className="gha-label">Admin access</span>
          <p className="gha-access-fixed">
            <span className="gha-role">Admin</span> Enabled · full access to Green Hill Admin
          </p>
        </div>

        {result ? (
          <div className={`gha-alert${result.message === 'Already an admin.' ? ' gha-alert--info' : ''}`} role="alert">
            <div>{result.message}</div>
          </div>
        ) : null}

        <div className="gha-dialog__foot">
          <button type="button" className="gha-btn gha-btn--secondary" onClick={onClose} disabled={invite.isPending}>
            Cancel
          </button>
          <button type="submit" className="gha-btn gha-btn--primary" disabled={invite.isPending}>
            {invite.isPending ? <Loader2 size={16} className="gha-spin" aria-hidden /> : null}
            {invite.isPending ? 'Sending…' : 'Send invitation'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

