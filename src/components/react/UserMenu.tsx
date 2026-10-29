import { useEffect, useRef, useState } from "react";
import QueryProvider from "@/lib/query/QueryProvider";
import { useAuth } from "@/lib/auth/useAuth";
import AuthDialog, { type AuthLabels } from "./AuthDialog";

type UserMenuVariant = "header" | "drawer";

interface Props {
  labels: AuthLabels;
  /** "header" (default): 紧凑按钮/头像；"drawer": 全宽列表项（带图标，匹配抽屉导航风格） */
  variant?: UserMenuVariant;
}

function UserMenuInner({ labels, variant = "header" }: Props) {
  const { user, signOut } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const confirmCancelRef = useRef<HTMLButtonElement>(null);

  // 桌面 header 的弹出菜单外部点击关闭
  useEffect(() => {
    if (!menuOpen) return;
    function onPointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  // 确认弹窗：Esc / 点击外部关闭
  useEffect(() => {
    if (!confirmOpen) return;
    confirmCancelRef.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setConfirmOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [confirmOpen]);

  function closeDialogAndRefocus() {
    setDialogOpen(false);
    triggerRef.current?.focus();
  }

  function handleSignOut() {
    setConfirmOpen(false);
    void signOut();
    setMenuOpen(false);
    triggerRef.current?.focus();
  }

  // ---------- 未登录 ----------
  if (!user) {
    if (variant === "drawer") {
      return (
        <>
          <button
            ref={triggerRef}
            type="button"
            onClick={() => setDialogOpen(true)}
            className="focus-outline hover:bg-muted hover:text-accent flex w-full items-center gap-3 rounded-lg px-4 py-3 text-base font-medium transition-colors text-left"
          >
            <svg
              className="size-5 shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            {labels.signIn}
          </button>
          {dialogOpen && (
            <AuthDialog labels={labels} onClose={closeDialogAndRefocus} />
          )}
        </>
      );
    }
    return (
      <>
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setDialogOpen(true)}
          className="focus-outline border-border hover:border-accent hover:text-accent rounded-md border px-3 py-1 text-sm font-medium"
        >
          {labels.signIn}
        </button>
        {dialogOpen && (
          <AuthDialog labels={labels} onClose={closeDialogAndRefocus} />
        )}
      </>
    );
  }

  // ---------- 已登录 ----------
  const initial = (user.email?.[0] ?? "U").toUpperCase();

  if (variant === "drawer") {
    return (
      <div>
        {/* 用户信息：和下面的退出登录按钮视觉对齐（gap-3 / px-4 / py-3 一致） */}
        <div className="flex items-center gap-3 px-4 py-2">
          <span className="bg-accent/10 text-accent flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold">
            {initial}
          </span>
          <span className="truncate text-sm text-muted-foreground">
            {user.email}
          </span>
        </div>

        {/* 退出登录 —— 点了弹确认 */}
        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          className="focus-outline hover:bg-muted hover:text-accent flex w-full items-center gap-3 rounded-lg px-4 py-3 text-base font-medium transition-colors text-left"
        >
          <svg
            className="size-5 shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          {labels.signOut}
        </button>

        {/* 退出确认弹层 —— 和 AuthDialog 同款蒙版 + 居中 */}
        {confirmOpen && (
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setConfirmOpen(false);
            }}
            aria-hidden="true"
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label={labels.signOutConfirmTitle}
              className="bg-background border-border relative w-full max-w-sm rounded-xl border p-6 shadow-xl"
            >
              <p className="mb-1 text-base font-semibold">
                {labels.signOutConfirmTitle}
              </p>
              <p className="text-muted-foreground mb-5 text-sm">
                {labels.signOutConfirmBody}
              </p>
              <div className="flex justify-end gap-2">
                <button
                  ref={confirmCancelRef}
                  type="button"
                  onClick={() => setConfirmOpen(false)}
                  className="focus-outline border-border hover:bg-muted rounded-md border px-3 py-1.5 text-sm transition-colors"
                >
                  {labels.signOutCancel}
                </button>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="bg-accent focus-outline hover:opacity-90 rounded-md px-3 py-1.5 text-sm font-medium text-white transition-opacity"
                >
                  {labels.signOutConfirmAction}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // header 紧凑模式（头像 + 弹出菜单 + 退出确认）
  return (
    <div ref={menuRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        aria-label={labels.menuLabel}
        onClick={() => setMenuOpen(open => !open)}
        className="focus-outline bg-accent/10 text-accent flex size-8 items-center justify-center rounded-full text-sm font-semibold"
      >
        {initial}
      </button>

      {menuOpen && (
        <div
          role="menu"
          className="bg-background border-border absolute end-0 top-full z-50 mt-2 min-w-[200px] overflow-hidden rounded-lg border shadow-lg"
        >
          <p className="border-border text-muted-foreground truncate border-b px-4 py-2 text-xs">
            {user.email}
          </p>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setMenuOpen(false);
              setConfirmOpen(true);
            }}
            className="hover:bg-muted hover:text-accent block w-full px-4 py-2 text-start text-sm"
          >
            {labels.signOut}
          </button>
        </div>
      )}

      {/* header 模式的退出确认 —— 和 AuthDialog 同款蒙版 + 居中 */}
      {confirmOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setConfirmOpen(false);
          }}
          aria-hidden="true"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={labels.signOutConfirmTitle}
            className="bg-background border-border relative w-full max-w-sm rounded-xl border p-6 shadow-xl"
          >
            <p className="mb-1 text-base font-semibold">
              {labels.signOutConfirmTitle}
            </p>
            <p className="text-muted-foreground mb-5 text-sm">
              {labels.signOutConfirmBody}
            </p>
            <div className="flex justify-end gap-2">
              <button
                ref={confirmCancelRef}
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="focus-outline border-border hover:bg-muted rounded-md border px-3 py-1.5 text-sm transition-colors"
              >
                {labels.signOutCancel}
              </button>
              <button
                type="button"
                onClick={handleSignOut}
                className="bg-accent focus-outline hover:opacity-90 rounded-md px-3 py-1.5 text-sm font-medium text-white transition-opacity"
              >
                {labels.signOutConfirmAction}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Header island, hydrated at idle. Self-contained with the shared QueryClient. */
export default function UserMenu({ labels, variant }: Props) {
  return (
    <QueryProvider>
      <UserMenuInner labels={labels} variant={variant} />
    </QueryProvider>
  );
}
