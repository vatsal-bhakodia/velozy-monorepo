import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";
import { supabase, useSession } from "@/src/lib/auth";
import { apiFetch } from "@/src/lib/api";
import { AuthLayout } from "@/src/auth-layout";
import { Button } from "@/components/ui/button";

export default function SignIn() {
  const { status } = useSession();
  const location = useLocation();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const destination = (location.state as { from?: string } | null)?.from ?? "/";
  const builderDestination = new URLSearchParams(location.search).get("next");

  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;
    void apiFetch("/api/admin/projects")
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not load your projects.");
        return response.json();
      })
      .then((result) => {
        if (cancelled) return;
        if (!result.projects?.length) navigate("/onboard", { replace: true });
        else if (builderDestination?.startsWith("/page-builder/builder"))
          window.location.replace(builderDestination);
        else navigate(destination, { replace: true });
      })
      .catch((cause) => {
        if (!cancelled)
          setError(
            cause instanceof Error
              ? cause.message
              : "Could not load your projects.",
          );
      });
    return () => {
      cancelled = true;
    };
  }, [status, destination, builderDestination, navigate]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: String(form.get("email")),
        password: String(form.get("password")),
      });
      if (authError) setError(authError.message);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not sign in.");
    } finally {
      setSubmitting(false);
    }
  }

  async function signInWithGoogle() {
    setError("");
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (authError) setError(authError.message);
  }

  return (
    <AuthLayout
      eyebrow="Your workspace awaits"
      headline="Build something"
      mutedHeadline="worth sharing."
      description="Pick up where you left off and turn your next idea into a polished website with Velozy."
      title="Welcome back"
      subtitle="Sign in to your account to continue"
    >
      {error && (
        <p
          role="alert"
          className="rounded-md border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-300"
        >
          {error}
        </p>
      )}
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="signin-email" className="block text-sm text-white/70">
            Email
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-3 h-4 w-4 text-neutral-400" />
            <input
              id="signin-email"
              required
              name="email"
              type="email"
              autoComplete="email"
              placeholder="Enter your email"
              className="h-10 w-full rounded-md border border-transparent bg-white/[0.035] pl-10 pr-3 text-sm text-white placeholder:text-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/30"
            />
          </div>
        </div>
        <div className="space-y-2">
          <label
            htmlFor="signin-password"
            className="block text-sm text-white/70"
          >
            Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-3 h-4 w-4 text-neutral-400" />
            <input
              id="signin-password"
              required
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Enter your password"
              className="h-10 w-full rounded-md border border-transparent bg-white/[0.035] pl-10 pr-10 text-sm text-white placeholder:text-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/30"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-3 top-3 rounded-sm text-white/40 hover:text-cyan-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/40"
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
          disabled={submitting}
          className="w-full bg-white text-black hover:bg-neutral-200 hover:text-black dark:hover:bg-neutral-200 dark:hover:text-black"
        >
          {submitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Signing in...
            </>
          ) : (
            "Sign in"
          )}
        </Button>
      </form>
      <div className="relative text-center text-xs uppercase">
        <div className="absolute inset-x-0 top-1/2 border-t border-white/40" />
        <span className="relative bg-[#090d13] px-2 text-white/40">
          Or continue with
        </span>
      </div>
      <button
        type="button"
        onClick={signInWithGoogle}
        disabled={submitting}
        className="flex h-10 w-full items-center justify-center rounded-md border border-transparent bg-white/[0.04] text-sm font-medium text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/40 disabled:opacity-50"
      >
        <img
          src="/icons/google.svg"
          width="20"
          height="20"
          alt=""
          className="mr-2 h-4 w-4"
        />
        Continue with Google
      </button>
      <p className="text-center text-sm">
        Don&apos;t have an account?{" "}
        <Link
          to="/signup"
          className="font-medium text-cyan-300 hover:text-cyan-100"
        >
          Sign up
        </Link>
      </p>
    </AuthLayout>
  );
}
