import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAdminSession } from '../AdminSession';

/**
 * Users & Admins. Reads and profile/access changes go through admin-only
 * database functions (each checks public.is_admin()); inviting a new admin
 * goes through the `admin-users` Edge Function, the only place the Supabase
 * Admin API is used. Passwords never pass through here.
 */

export const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'id', label: 'Bahasa Indonesia' },
  { value: 'nl', label: 'Nederlands' },
  { value: 'es', label: 'Español' },
] as const;

export type AdminUser = {
  id: string;
  email: string;
  fullName: string;
  preferredLanguage: string;
  isAdmin: boolean;
  isSelf: boolean;
  createdAt: string | null;
  lastSignInAt: string | null;
  emailConfirmedAt: string | null;
  invitedAt: string | null;
};

/** Only states the data can actually tell apart. */
export type UserStatus = 'active' | 'invited' | 'no-access';

export function userStatus(user: AdminUser): UserStatus {
  if (!user.isAdmin) return 'no-access';
  if (user.invitedAt && !user.emailConfirmedAt) return 'invited';
  return 'active';
}

export const STATUS_LABEL: Record<UserStatus, string> = {
  active: 'Active',
  invited: 'Invitation sent',
  'no-access': 'No admin access',
};

export function displayName(user: Pick<AdminUser, 'fullName' | 'email'>): string {
  return user.fullName || user.email;
}

export function initials(user: Pick<AdminUser, 'fullName' | 'email'>): string {
  const source = user.fullName || user.email.split('@')[0];
  const parts = source.split(/[\s._-]+/).filter(Boolean);
  const letters = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : source.slice(0, 2);
  return letters.toUpperCase();
}

type Row = {
  id: string;
  email: string | null;
  full_name: string | null;
  preferred_language: string | null;
  is_admin: boolean;
  is_self: boolean;
  created_at: string | null;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
  invited_at: string | null;
};

export function userFromRow(row: Row): AdminUser {
  return {
    id: row.id,
    email: row.email ?? '',
    fullName: (row.full_name ?? '').trim(),
    preferredLanguage: row.preferred_language ?? 'en',
    isAdmin: Boolean(row.is_admin),
    isSelf: Boolean(row.is_self),
    createdAt: row.created_at,
    lastSignInAt: row.last_sign_in_at,
    emailConfirmedAt: row.email_confirmed_at,
    invitedAt: row.invited_at,
  };
}

const DB_MESSAGES: [RegExp, string][] = [
  [/gh:last_admin/, 'Green Hill needs at least one admin, so this access can’t be removed.'],
  [/gh:self_access/, 'You can’t remove your own admin access. Another admin can do this for you.'],
  [/gh:not_admin/, 'Your account no longer has admin access. Please sign in again.'],
  [/gh:no_user/, 'This account no longer exists. Refresh the list and try again.'],
  [/gh:bad_language/, 'Please choose one of the four website languages.'],
  [/gh:name_too_long/, 'Please keep the name under 120 characters.'],
  [/PGRST202|Could not find the function/i, 'User management isn’t switched on yet: its database update hasn’t been applied.'],
  [/failed to fetch|network/i, 'We couldn’t reach Green Hill just now. Please check your connection and try again.'],
];

export function userErrorMessage(error: unknown): string {
  const e = error as { message?: string; code?: string } | null;
  const text = `${e?.code ?? ''} ${e?.message ?? ''}`;
  return DB_MESSAGES.find(([pattern]) => pattern.test(text))?.[1] ?? 'Something went wrong on our side. Please try again in a moment.';
}

export type InviteResult = { code: string; message: string; ok: boolean };

const INVITE_MESSAGES: Record<string, string> = {
  invited: 'Admin invitation sent. They’ll choose their own password from the email.',
  access_granted: 'This email already has an account. Admin access has been given to it.',
  already_admin: 'Already an admin.',
  invalid_input: 'Please check the name and email address.',
  not_admin: 'Your account no longer has admin access. Please sign in again.',
  email_rate_limited:
    'Nothing was sent: Green Hill’s email service has reached its hourly limit (Supabase’s built-in mailer allows only a few emails per hour). Try again later, or set up custom SMTP in Supabase.',
  email_unavailable:
    'The invitation email couldn’t be sent. Supabase’s built-in email service only delivers to members of the Green Hill Supabase organisation. To invite anyone, set up custom SMTP in Supabase (Authentication → Emails → SMTP Settings).',
  profile_failed: 'The invitation was sent, but admin access couldn’t be linked. Use “Give admin access” on their row.',
  not_deployed:
    'Adding admins isn’t switched on yet: the secure admin service (Supabase Edge Function “admin-users”) hasn’t been deployed.',
  invite_failed: 'The invitation couldn’t be created. Please try again in a moment.',
};

export function inviteResult(code: string): InviteResult {
  return {
    code,
    ok: code === 'invited' || code === 'access_granted',
    message: INVITE_MESSAGES[code] ?? INVITE_MESSAGES.invite_failed,
  };
}

async function invokeInvite(input: { email: string; fullName: string; language: string }): Promise<InviteResult> {
  const { data, error } = await supabase.functions.invoke('admin-users', {
    body: {
      action: 'invite',
      ...input,
      redirectTo: `${window.location.origin}/${input.language}/auth/update-password`,
    },
  });
  if (!error) return inviteResult((data as { code?: string } | null)?.code ?? 'invite_failed');

  const response = (error as { context?: Response }).context;
  if (response && typeof response.status === 'number') {
    let code = '';
    try {
      code = ((await response.clone().json()) as { code?: string }).code ?? '';
    } catch {
      code = '';
    }
    if (response.status === 404 && !INVITE_MESSAGES[code]) return inviteResult('not_deployed');
    return inviteResult(code || 'invite_failed');
  }
  return inviteResult(/failed to send a request|fetch/i.test(error.message ?? '') ? 'not_deployed' : 'invite_failed');
}

const KEY = ['gh-admin', 'users'] as const;

export function useAdminUsers() {
  const { repository, isLocalPreview } = useAdminSession();
  return useQuery({
    queryKey: KEY,
    enabled: repository?.mode === 'supabase' && !isLocalPreview,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_list_users');
      if (error) throw new Error(userErrorMessage(error));
      return ((data ?? []) as Row[]).map(userFromRow);
    },
  });
}

export function useSaveProfile() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; fullName: string; language: string }) => {
      const { error } = await supabase.rpc('admin_save_profile', {
        p_id: input.id,
        p_full_name: input.fullName,
        p_preferred_language: input.language,
      });
      if (error) throw new Error(userErrorMessage(error));
    },
    onSettled: () => client.invalidateQueries({ queryKey: KEY }),
  });
}

export function useSetAccess() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; enabled: boolean }) => {
      const { error } = await supabase.rpc('admin_set_access', { p_id: input.id, p_enabled: input.enabled });
      if (error) throw new Error(userErrorMessage(error));
    },
    onSettled: () => client.invalidateQueries({ queryKey: KEY }),
  });
}

export function useInviteAdmin() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: invokeInvite,
    onSettled: () => client.invalidateQueries({ queryKey: KEY }),
  });
}

/** The signed-in admin's own row, for the name shown in the navigation. */
export function useSelf(): AdminUser | null {
  const users = useAdminUsers();
  return users.data?.find((user) => user.isSelf) ?? null;
}
