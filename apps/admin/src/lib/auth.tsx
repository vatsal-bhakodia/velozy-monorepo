import {
  authStorage,
  setStorageRememberSession,
  getStorageRememberSession,
} from "./auth-storage";
import { safeStorage } from "@/src/onboard/safe-storage";
import {
  ONBOARDING_DRAFT_STORAGE_KEY,
  useOnboardingStore,
} from "@/src/onboard/onboarding-store";
import { clearOnboardingSession } from "@/src/onboard/storage-keys";
import { PENDING_LOGO_STORAGE_KEY } from "@/src/onboard/storage-keys";
import { createClient, type User } from "@supabase/supabase-js";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  type ReactNode,
} from "react";
import { queryClient } from "@/src/lib/query-client";
import { useProjectStore } from "@/src/lib/project-store";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const rememberSessionKey = "velozy-auth-remember-session";

function readRememberSession() {
  try {
    return (
      typeof window === "undefined" ||
      window.sessionStorage.getItem(rememberSessionKey) !== "false"
    );
  } catch {
    return true;
  }
}

let rememberSession = readRememberSession();
setStorageRememberSession(rememberSession);

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { storage: authStorage },
});

export function setRememberSession(remember: boolean) {
  rememberSession = remember;
  setStorageRememberSession(remember);
  try {
    window.sessionStorage.setItem(rememberSessionKey, String(remember));
  } catch {}
}

export function getRememberSession() {
  return getStorageRememberSession();
}

type SessionUser = { name?: string | null; email?: string | null };
type Session = { user: SessionUser };
type AuthState = { user: User | null; loading: boolean };
const AuthContext = createContext<AuthState>({ user: null, loading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const previousIdentity = useRef<string | null>(null);
  const [state, setState] = useState<AuthState>({ user: null, loading: true });

  useEffect(() => {
    let authEventSeen = false;
    let active = true;
    void supabase.auth.getUser().then(({ data }) => {
      if (!active || authEventSeen) return;
      previousIdentity.current = data.user?.id ?? null;
      setState({ user: data.user, loading: false });
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      authEventSeen = true;
      const nextIdentity = session?.user?.id ?? null;
      if (
        previousIdentity.current &&
        previousIdentity.current !== nextIdentity
      ) {
        clearOnboardingSession();
        useOnboardingStore.getState().resetWorkflow();
        safeStorage.removeItem(PENDING_LOGO_STORAGE_KEY);
        safeStorage.removeItem(ONBOARDING_DRAFT_STORAGE_KEY);
        queryClient.clear();
        useProjectStore.getState().resetRuntimeSelection();
      }
      previousIdentity.current = nextIdentity;
      if (!session?.user) {
        queryClient.clear();
        useProjectStore.getState().resetRuntimeSelection();
      }
      setState({ user: session?.user ?? null, loading: false });
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useSession() {
  const { user, loading } = useContext(AuthContext);
  const session: Session | null = user
    ? {
        user: {
          name: user.user_metadata.full_name ?? user.email,
          email: user.email,
        },
      }
    : null;
  return {
    data: session,
    user,
    status: loading ? "loading" : user ? "authenticated" : "unauthenticated",
  };
}

export async function getAccessToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export async function signOut({
  callbackUrl = "/signin",
}: { callbackUrl?: string } = {}) {
  await supabase.auth.signOut();
  queryClient.clear();
  useProjectStore.getState().resetRuntimeSelection();
  window.location.assign(callbackUrl);
}
