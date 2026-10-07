import { createClient, type User } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { queryClient } from "@/src/lib/query-client";
import { useProjectStore } from "@/src/lib/project-store";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

type SessionUser = { name?: string | null; email?: string | null };
type Session = { user: SessionUser };
type AuthState = { user: User | null; loading: boolean };
const AuthContext = createContext<AuthState>({ user: null, loading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, loading: true });

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) =>
      setState({ user: data.user, loading: false }),
    );
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        queryClient.clear();
        useProjectStore.getState().resetRuntimeSelection();
      }
      setState({ user: session?.user ?? null, loading: false });
    });
    return () => data.subscription.unsubscribe();
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useSession() {
  const { user, loading } = useContext(AuthContext);
  const session: Session | null = user
    ? { user: { name: user.user_metadata.full_name ?? user.email, email: user.email } }
    : null;
  return { data: session, user, status: loading ? "loading" : user ? "authenticated" : "unauthenticated" };
}

export async function getAccessToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export async function signOut({ callbackUrl = "/signin" }: { callbackUrl?: string } = {}) {
  await supabase.auth.signOut();
  queryClient.clear();
  useProjectStore.getState().resetRuntimeSelection();
  window.location.assign(callbackUrl);
}
