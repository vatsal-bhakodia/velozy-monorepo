import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";
import { supabase, useSession } from "@/src/lib/auth";
import { apiFetch } from "@/src/lib/api";
import { AuthLayout } from "@/src/auth-layout";
import { Button } from "@/components/ui/button";

export default function SignUp() {
  const { status } = useSession();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;
    void apiFetch("/api/admin/projects")
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not load your projects.");
        return response.json();
      })
      .then((result) => {
        if (!cancelled) navigate(result.projects?.length ? "/" : "/onboard", { replace: true });
      })
      .catch((cause) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "Could not load your projects.");
      });
    return () => { cancelled = true; };
  }, [status, navigate]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setMessage("");
    const form = new FormData(event.currentTarget);
    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email: String(form.get("email")),
        password: String(form.get("password")),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (authError) setError(authError.message);
      else if (!data.session) setMessage("Check your email to confirm your account, then sign in.");
    } catch (cause) {
      setError(cause instanceof TypeError
        ? "Could not reach the authentication service. Check your connection and try again."
        : cause instanceof Error ? cause.message : "Authentication failed. Please try again.");
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

  return <AuthLayout title="Create an account" subtitle="Sign up to get started with your account" footer={<p>Already have an account? <Link to="/signin" className="font-medium text-cyan-300 hover:text-cyan-100">Sign in</Link></p>}>
    {error && <p role="alert" className="rounded-md border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-300">{error}</p>}
    {message && <p role="status" className="rounded-md border border-green-400/30 bg-green-400/10 px-3 py-2 text-sm text-green-300">{message}</p>}
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-2"><label htmlFor="signup-email" className="block text-sm text-white/70">Email</label><div className="relative"><Mail className="absolute left-3 top-3 h-4 w-4 text-neutral-400" /><input id="signup-email" required name="email" type="email" autoComplete="email" placeholder="Enter your email" className="h-11 w-full rounded-md border border-white/[0.08] bg-white/[0.08] pl-10 pr-3 text-sm text-white placeholder:text-white/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/40" /></div></div>
      <div className="space-y-2"><label htmlFor="signup-password" className="block text-sm text-white/70">Password</label><div className="relative"><Lock className="absolute left-3 top-3 h-4 w-4 text-neutral-400" /><input id="signup-password" required minLength={6} name="password" type={showPassword ? "text" : "password"} autoComplete="new-password" placeholder="Enter your password" className="h-11 w-full rounded-md border border-white/[0.08] bg-white/[0.08] pl-10 pr-10 text-sm text-white placeholder:text-white/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/40" /><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide password" : "Show password"} className="absolute right-3 top-3 rounded-sm text-white/40 hover:text-cyan-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/40">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></div>
      <Button type="submit" disabled={submitting} className="w-full bg-white text-black hover:bg-neutral-200 hover:text-black dark:hover:bg-neutral-200 dark:hover:text-black">{submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating account...</> : "Create account"}</Button>
    </form>
    <button type="button" onClick={signInWithGoogle} disabled={submitting} className="flex h-11 w-full items-center justify-center rounded-md bg-white/[0.04] text-sm font-medium text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/40 disabled:opacity-50"><img src="/icons/google.svg" width="20" height="20" alt="" className="mr-2 h-4 w-4" />Continue with Google</button>
  </AuthLayout>;
}
