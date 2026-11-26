import type { AuthError } from "@supabase/supabase-js";

export interface AuthErrorLabels {
  errInvalidCredentials: string;
  errEmailNotConfirmed: string;
  errUserExists: string;
  errRateLimited: string;
  errGeneric: string;
}

/** 将 Supabase AuthError 映射为已本地化、面向用户的提示文案。 */
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
