import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { User } from "@supabase/supabase-js";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { queryClient } from "@/lib/query/client";
import { queryKeys } from "@/lib/query/keys";
import { authCallbackUrl } from "./urls";

let subscribed = false;

/**
 * Idempotently installs the global auth → query-cache bridge.
 * Safe to call from every island: only the first call subscribes.
 */
function ensureAuthSubscription() {
  if (subscribed) return;
  subscribed = true;

  const supabase = getBrowserSupabase();

  // Initial seed (storage may already hold a valid session).
  supabase.auth.getSession().then(({ data }) => {
    queryClient.setQueryData(queryKeys.authUser(), data.session?.user ?? null);
  });

  supabase.auth.onAuthStateChange(event => {
    supabase.auth.getUser().then(({ data }) => {
      queryClient.setQueryData(queryKeys.authUser(), data.user ?? null);
    });

    // Reactions are identity-dependent (selected state); refetch on sign change.
    if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
      queryClient.invalidateQueries({ queryKey: ["reactions"] });
    }
  });
}

export function useAuthUser(): User | null {
  const { data } = useQuery({
    queryKey: queryKeys.authUser(),
    queryFn: async () => {
      const { data: result } = await getBrowserSupabase().auth.getUser();
      return result.user ?? null;
    },
    staleTime: Infinity,
    gcTime: Infinity,
    initialData: null,
  });
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
    ensureAuthSubscription();
  }, []);

  // Islands are prerendered without a session, and the shared QueryClient may
  // already hold one by the time a later island hydrates (UserMenu runs first).
  // Rendering the signed-in state on the first client pass mismatches the
  // server HTML (React #418), so hold the signed-out state until hydrated.
  return hydrated ? (data as User | null) : null;
}

export function useAuth() {
  const user = useAuthUser();
  const reactQueryClient = useQueryClient();

  const signIn = (email: string, password: string) =>
    getBrowserSupabase().auth.signInWithPassword({ email, password });

  /**
   * Registers a new account.
   * Returns `needsConfirmation: true` when Supabase accepted the signup
   * but email confirmation is enabled (no session returned).
   */
  const signUp = async (email: string, password: string) => {
    const result = await getBrowserSupabase().auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: authCallbackUrl(),
      },
    });
    return {
      ...result,
      needsConfirmation: !result.data.session && !result.error,
    };
  };

  const signOut = async () => {
    const { error } = await getBrowserSupabase().auth.signOut();
    reactQueryClient.setQueryData(queryKeys.authUser(), null);
    return { error };
  };

  const signInWithGithub = (nextPath?: string) =>
    getBrowserSupabase().auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: authCallbackUrl(nextPath),
      },
    });

  return { user, signIn, signUp, signOut, signInWithGithub };
}
