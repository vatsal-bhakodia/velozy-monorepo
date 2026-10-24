import { useState, type FormEvent } from "react";
import { CheckCircle2, Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";
import { supabase } from "@/src/lib/auth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAuthenticated: () => void;
};

export function OnboardingAuthModal({
  open,
  onOpenChange,
  onAuthenticated,
}: Props) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const inputClassName =
    "border-slate-300 bg-slate-50 text-slate-900 placeholder:text-slate-400 transition-colors hover:border-slate-400 focus-visible:border-cyan-500 focus-visible:ring-cyan-500/25 dark:border-neutral-700 dark:bg-neutral-800/80 dark:text-neutral-100 dark:placeholder:text-neutral-500 dark:hover:border-neutral-600 dark:focus-visible:border-cyan-400 dark:focus-visible:ring-cyan-400/30";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email"));
    const password = String(form.get("password"));
    try {
      if (mode === "signup") {
        const { data, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (authError) throw authError;
        if (data.session) onAuthenticated();
        else
          setMessage(
            "Check your email to confirm your account, then return to this browser to keep these answers. They are saved to your account only after you sign in and choose to continue them.",
          );
      } else {
        const { error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (authError) throw authError;
        onAuthenticated();
      }
    } catch (cause) {
      setError(
        cause instanceof TypeError
          ? "Could not reach the authentication service. Check your connection and try again."
          : cause instanceof Error
            ? cause.message
            : "Authentication failed. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function signInWithGoogle() {
    setLoading(true);
    setError("");
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (authError) {
      setError(authError.message);
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md overflow-hidden border-slate-200/80 bg-white p-0 text-slate-900 shadow-2xl dark:border-neutral-700 dark:bg-neutral-900 dark:text-white">
        <div className="p-6 sm:p-7">
          <DialogHeader className="space-y-2 text-left">
            <DialogTitle className="text-2xl tracking-tight">
              Save your progress
            </DialogTitle>
            <DialogDescription>
              Create an account before we generate your site structure. Your
              profile and answers are ready to continue.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-5 grid grid-cols-2 rounded-lg bg-slate-100 p-1 dark:bg-neutral-800">
            {(["signin", "signup"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => {
                  setMode(option);
                  setError("");
                  setMessage("");
                }}
                className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${mode === option ? "bg-white text-slate-900 shadow-sm dark:bg-neutral-700 dark:text-white" : "text-slate-500 dark:text-neutral-400"}`}
              >
                {option === "signin" ? "Sign in" : "Create account"}
              </button>
            ))}
          </div>
          {error && (
            <p
              role="alert"
              className="mt-4 rounded-md bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-300"
            >
              {error}
            </p>
          )}
          {message && (
            <p
              role="status"
              className="mt-4 rounded-md bg-cyan-500/10 p-3 text-sm text-cyan-700 dark:text-cyan-200"
            >
              {message}
            </p>
          )}
          <form onSubmit={submit} className="mt-5 space-y-4">
            <div className="space-y-2">
              <label htmlFor="onboarding-email" className="text-sm">
                Email
              </label>
              <div className="group relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400 transition-colors group-focus-within:text-cyan-600 dark:group-focus-within:text-cyan-300" />
                <Input
                  id="onboarding-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  className={`${inputClassName} pl-10`}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <label htmlFor="onboarding-password" className="text-sm">
                Password
              </label>
              <div className="group relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400 transition-colors group-focus-within:text-cyan-600 dark:group-focus-within:text-cyan-300" />
                <Input
                  id="onboarding-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete={
                    mode === "signup" ? "new-password" : "current-password"
                  }
                  placeholder={
                    mode === "signup"
                      ? "Create a password"
                      : "Enter your password"
                  }
                  className={`${inputClassName} pl-10 pr-10`}
                  minLength={6}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-3 top-2.5 rounded-sm text-slate-400 transition-colors hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40 dark:hover:text-white dark:focus-visible:ring-cyan-300/40"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
            <Button
              type="submit"
              className="w-full bg-white text-black hover:bg-neutral-200 hover:text-black dark:hover:bg-neutral-200 dark:hover:text-black"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Continuing...
                </>
              ) : mode === "signin" ? (
                "Sign in and continue"
              ) : (
                "Create account and continue"
              )}
            </Button>
          </form>
          <div className="my-5 flex items-center gap-3 text-xs text-slate-400">
            <div className="h-px flex-1 bg-slate-200 dark:bg-neutral-700" />
            or
            <div className="h-px flex-1 bg-slate-200 dark:bg-neutral-700" />
          </div>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={signInWithGoogle}
            disabled={loading}
          >
            <img src="/icons/google.svg" alt="" className="mr-2 h-4 w-4" />
            Continue with Google
          </Button>
          <p className="mt-4 flex items-center justify-center gap-1 text-xs text-slate-500">
            <CheckCircle2 className="h-3.5 w-3.5 text-cyan-500" />
            Choose which answers to save after signing in
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
