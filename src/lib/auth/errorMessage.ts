import type { AuthError } from "@supabase/supabase-js";

export interface AuthErrorLabels {
  errInvalidCredentials: string;
  errEmailNotConfirmed: string;
  errUserExists: string;
  errRateLimited: string;
  errGeneric: string;
}

/** Maps a Supabase AuthError to a localized, user-facing message. */
export function mapAuthError(
  error: AuthError,
  labels: AuthErrorLabels
): string {
  const message = error.message ?? "";

  if (/invalid login credentials/i.test(message)) {
    return labels.errInvalidCredentials;
  }
  if (/email not confirmed/i.test(message)) {
    return labels.errEmailNotConfirmed;
  }
  if (/already registered|user already exists/i.test(message)) {
    return labels.errUserExists;
  }
  if (/rate limit|too many|over_email/i.test(message)) {
    return labels.errRateLimited;
  }
  return labels.errGeneric;
}
