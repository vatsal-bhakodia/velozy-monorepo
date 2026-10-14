import { createClient, type User } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { queryClient } from "@/src/lib/query-client";
import { useProjectStore } from "@/src/lib/project-store";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const rememberSessionKey = "velozy-auth-remember-session";

function readRememberSession() {
  return typeof window === "undefined" || window.sessionStorage.getItem(rememberSessionKey) !== "false";
}

let rememberSession = readRememberSession();

const authStorage = {
  getItem(key: string) {
    const localValue = window.localStorage.getItem(key);
    const sessionValue = window.sessionStorage.getItem(key);
    if (key.endsWith("-auth-token") && (localValue !== null || sessionValue !== null)) {
      rememberSession = localValue !== null;
      window.sessionStorage.setItem(rememberSessionKey, String(rememberSession));
    }
    return localValue ?? sessionValue;
  },
  setItem(key: string, value: string) {
    const target = rememberSession ? window.localStorage : window.sessionStorage;
    const other = rememberSession ? window.sessionStorage : window.localStorage;
    other.removeItem(key);
    target.setItem(key, value);
  },
  removeItem(key: string) {
    window.localStorage.removeItem(key);
    window.sessionStorage.removeItem(key);
  },
};

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { storage: authStorage },
});

export function setRememberSession(remember: boolean) {
  rememberSession = remember;
  window.sessionStorage.setItem(rememberSessionKey, String(remember));
}

export function getRememberSession() {
  return rememberSession;
}

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
