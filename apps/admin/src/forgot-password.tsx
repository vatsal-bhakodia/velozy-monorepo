import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthGradientBackground } from "@/src/auth-layout";
import { supabase } from "@/src/lib/auth";
import logo from "../../marketing/public/logo.svg";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setSubmitting(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (resetError) setError(resetError.message);
      else setMessage("If an account exists for that email, we’ll send a password reset link.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not send the password reset email.");
    } finally {
      setSubmitting(false);
    }
  }

  return <div className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-black px-5 py-24 text-white sm:px-8">
    <AuthGradientBackground />
    <header className="absolute inset-x-0 top-0 z-10 flex h-24 items-center justify-start px-5 sm:px-8">
      <a href={import.meta.env.VITE_MARKETING_URL ?? "http://localhost:3000"} aria-label="Velozy home" className="inline-flex rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">
        <img src={logo} alt="Velozy" width="140" height="35" className="h-8 w-auto brightness-0 invert" />
      </a>
    </header>
    <main className="relative z-10 w-full max-w-md rounded-2xl bg-[#080a0d] p-7 shadow-2xl shadow-black/30 sm:p-10">
      <div className="mb-8 space-y-2 text-center">
        <h1 className="text-3xl font-medium tracking-[-.05em]">Forgot password?</h1>
        <p className="text-sm text-white/55">Enter your email and we’ll send you a link to reset it.</p>
      </div>
      {error && <p role="alert" className="mb-4 rounded-md border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-300">{error}</p>}
      {message && <p role="status" className="mb-4 rounded-md border border-green-400/30 bg-green-400/10 px-3 py-2 text-sm text-green-300">{message}</p>}
      <form onSubmit={submit} className="space-y-5">
        <div className="space-y-2">
          <label htmlFor="forgot-email" className="block text-sm text-white/70">Email</label>
          <input
            id="forgot-email"
            required
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Enter your email"
            className="h-11 w-full rounded-md border border-white/[0.08] bg-white/[0.08] px-3 text-sm text-white placeholder:text-white/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/40"
          />
        </div>
        <Button type="submit" disabled={submitting} className="w-full bg-white text-black hover:bg-neutral-200 hover:text-black dark:hover:bg-neutral-200 dark:hover:text-black">
          {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending link…</> : "Send reset link"}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-white/60">
        Remembered your password? <Link to="/signin" className="font-medium text-cyan-300 hover:text-cyan-100">Back to sign in</Link>
      </p>
    </main>
  </div>;
}
