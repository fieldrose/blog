import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import type { UIStrings } from "@/i18n/types";
import { useAuth } from "@/lib/auth/useAuth";
import { mapAuthError } from "@/lib/auth/errorMessage";

export type AuthLabels = UIStrings["auth"];

type Tab = "login" | "register";
type Phase = "form" | "loading" | "checkEmail";

const inputClass =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent";

export default function AuthDialog({
  labels,
  onClose,
}: {
  labels: AuthLabels;
  onClose: () => void;
}) {
  const { signIn, signUp, signInWithGithub } = useAuth();
  const [tab, setTab] = useState<Tab>("login");
  const [phase, setPhase] = useState<Phase>("form");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);

  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const emailId = useId();
  const passwordId = useId();
  const confirmId = useId();
  const errorId = useId();

  useEffect(() => {
    closeRef.current?.focus();

    // Window-level so Escape works regardless of which child has focus.
    function onWindowKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onWindowKeyDown);
    return () => window.removeEventListener("keydown", onWindowKeyDown);
  }, [onClose]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError(labels.errRequiredEmail);
      return;
    }
    if (!password) {
      setError(labels.errRequiredPassword);
      return;
    }
    if (tab === "register") {
      if (password.length < 8) {
        setError(labels.errPasswordTooShort);
        return;
      }
      if (password !== confirm) {
        setError(labels.errPasswordMismatch);
        return;
      }
    }

    setPhase("loading");

    if (tab === "login") {
      const { error: authError } = await signIn(trimmedEmail, password);
      if (authError) {
        setError(mapAuthError(authError, labels));
        setPhase("form");
        return;
      }
      onClose();
      return;
    }

    const result = await signUp(trimmedEmail, password);
    if (result.error) {
      setError(mapAuthError(result.error, labels));
      setPhase("form");
      return;
    }
    setPhase(result.needsConfirmation ? "checkEmail" : "form");
    if (!result.needsConfirmation) onClose();
  }

  const loading = phase === "loading";

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onMouseDown={event => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={labels.dialogAriaLabel}
        aria-describedby={error ? errorId : undefined}
        className="bg-background border-border relative w-full max-w-sm rounded-xl border p-6 shadow-xl"
      >
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label={labels.closeDialog}
          className="text-muted-foreground hover:text-accent absolute end-3 top-3 rounded p-1 text-xl leading-none"
        >
          ×
        </button>

        {phase === "checkEmail" ? (
          <div className="space-y-3 py-2 text-center">
            <h2 className="text-lg font-semibold">{labels.checkEmailTitle}</h2>
            <p className="text-muted-foreground text-sm">
              {labels.checkEmailBody}
            </p>
            <button
              type="button"
              onClick={() => {
                setTab("login");
                setPhase("form");
                setPassword("");
                setConfirm("");
              }}
              className="text-accent text-sm underline underline-offset-4"
            >
              {labels.backToLogin}
            </button>
          </div>
        ) : (
          <>
            <div className="border-border mb-4 flex rounded-lg border p-1">
              {(["login", "register"] as const).map(item => (
                <button
                  key={item}
                  type="button"
                  onClick={() => {
                    setTab(item);
                    setError(null);
                  }}
                  aria-pressed={tab === item}
                  className={[
                    "flex-1 rounded-md py-1.5 text-sm font-medium transition-colors",
                    tab === item
                      ? "bg-accent/10 text-accent"
                      : "text-muted-foreground hover:text-accent",
                  ].join(" ")}
                >
                  {item === "login" ? labels.loginTab : labels.registerTab}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-3" noValidate>
              <div className="space-y-1">
                <label htmlFor={emailId} className="text-sm font-medium">
                  {labels.email}
                </label>
                <input
                  id={emailId}
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={event => setEmail(event.target.value)}
                  disabled={loading}
                  className={inputClass}
                />
              </div>

              <div className="space-y-1">
                <label htmlFor={passwordId} className="text-sm font-medium">
                  {labels.password}
                </label>
                <input
                  id={passwordId}
                  type="password"
                  autoComplete={
                    tab === "login" ? "current-password" : "new-password"
                  }
                  required
                  minLength={8}
                  value={password}
                  onChange={event => setPassword(event.target.value)}
                  disabled={loading}
                  className={inputClass}
                />
              </div>

              {tab === "register" && (
                <div className="space-y-1">
                  <label htmlFor={confirmId} className="text-sm font-medium">
                    {labels.confirmPassword}
                  </label>
                  <input
                    id={confirmId}
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    value={confirm}
                    onChange={event => setConfirm(event.target.value)}
                    disabled={loading}
                    className={inputClass}
                  />
                </div>
              )}

              {error && (
                <p
                  id={errorId}
                  role="alert"
                  className="text-sm text-red-600 dark:text-red-400"
                >
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="bg-accent w-full rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                {loading
                  ? labels.submitting
                  : tab === "login"
                    ? labels.signIn
                    : labels.signUp}
              </button>
            </form>

            <div className="text-muted-foreground my-4 flex items-center gap-3 text-xs">
              <span className="bg-border h-px flex-1" />
              <span>OR</span>
              <span className="bg-border h-px flex-1" />
            </div>

            <button
              type="button"
              disabled={loading}
              onClick={() => void signInWithGithub(window.location.pathname)}
              className="border-border hover:border-accent hover:text-accent flex w-full items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-medium disabled:opacity-60"
            >
              <svg
                viewBox="0 0 16 16"
                width="16"
                height="16"
                aria-hidden="true"
                fill="currentColor"
              >
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
              </svg>
              {labels.githubButton}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
