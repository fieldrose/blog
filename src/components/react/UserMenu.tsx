import { useEffect, useRef, useState } from "react";
import QueryProvider from "@/lib/query/QueryProvider";
import { useAuth } from "@/lib/auth/useAuth";
import AuthDialog, { type AuthLabels } from "./AuthDialog";

function UserMenuInner({ labels }: { labels: AuthLabels }) {
  const { user, signOut } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

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

  function closeDialogAndRefocus() {
    setDialogOpen(false);
    triggerRef.current?.focus();
  }

  if (!user) {
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

  const initial = (user.email?.[0] ?? "U").toUpperCase();

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
              void signOut();
              triggerRef.current?.focus();
            }}
            className="hover:bg-muted hover:text-accent block w-full px-4 py-2 text-start text-sm"
          >
            {labels.signOut}
          </button>
        </div>
      )}
    </div>
  );
}

/** Header island, hydrated at idle. Self-contained with the shared QueryClient. */
export default function UserMenu({ labels }: { labels: AuthLabels }) {
  return (
    <QueryProvider>
      <UserMenuInner labels={labels} />
    </QueryProvider>
  );
}
