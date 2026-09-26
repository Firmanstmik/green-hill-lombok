/**
 * The password policy enforced by Supabase Auth for Green Hill
 * (supabase/config.toml: minimum_password_length = 12,
 * password_requirements = "lower_upper_letters_digits").
 * The UI shows and checks exactly these rules; a test keeps them in step.
 */
export const PASSWORD_MIN_LENGTH = 12;

export const PASSWORD_RULES = [
  { id: 'length', label: `At least ${PASSWORD_MIN_LENGTH} characters`, test: (value: string) => value.length >= PASSWORD_MIN_LENGTH },
  { id: 'lower', label: 'A lowercase letter', test: (value: string) => /[a-z]/.test(value) },
  { id: 'upper', label: 'An uppercase letter', test: (value: string) => /[A-Z]/.test(value) },
  { id: 'digit', label: 'A number', test: (value: string) => /\d/.test(value) },
] as const;

export const meetsPasswordPolicy = (value: string) => PASSWORD_RULES.every((rule) => rule.test(value));
