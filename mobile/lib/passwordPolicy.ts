export const PASSWORD_MIN_LENGTH = 8;

export const PASSWORD_REQUIREMENTS_HINT =
  'At least 8 characters, one uppercase letter, one number, one special character, and no spaces.';

export type PasswordValidationResult = { ok: true } | { ok: false; message: string };

export function validatePassword(password: string): PasswordValidationResult {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return {
      ok: false,
      message: `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`,
    };
  }
  if (/\s/.test(password)) {
    return { ok: false, message: 'Password cannot contain spaces.' };
  }
  if (!/[A-Z]/.test(password)) {
    return { ok: false, message: 'Password must include at least one uppercase letter.' };
  }
  if (!/[0-9]/.test(password)) {
    return { ok: false, message: 'Password must include at least one number.' };
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return { ok: false, message: 'Password must include at least one special character.' };
  }
  return { ok: true };
}

export function validatePasswordMatch(
  password: string,
  confirm: string,
): PasswordValidationResult {
  if (password !== confirm) {
    return { ok: false, message: 'Passwords do not match.' };
  }
  return { ok: true };
}
