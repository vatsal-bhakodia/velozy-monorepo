import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { AuthLayout } from "@/src/auth-layout";
import { supabase } from "@/src/lib/auth";
import { Button } from "@/components/ui/button";

export default function ResetPassword() {
  const [checkingLink, setCheckingLink] = useState(true);
  const [linkValid, setLinkValid] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [updated, setUpdated] = useState(false);

  useEffect(() => {
    let active = true;
    void supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active) return;
      setLinkValid(!sessionError && Boolean(data.session));
      setCheckingLink(false);
    });
    return () => { active = false; };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password"));
    if (password !== String(form.get("confirm-password"))) {
      setError("The passwords don’t match.");
      return;
    }

    setSubmitting(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message);
        return;
      }
      await supabase.auth.signOut();
      setUpdated(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not update your password.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title={updated ? "Password updated" : "Choose a new password"}
      subtitle={updated ? "Your password has been changed. Sign in to continue." : "Enter a new password for your account."}
      footer={<Link to="/signin" className="font-medium text-cyan-300 hover:text-cyan-100">Back to sign in</Link>}
    >
      {checkingLink ? <p role="status" className="text-center text-sm text-white/60">Checking your reset link…</p> : null}
      {!checkingLink && !linkValid && <p role="alert" className="rounded-md border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-300">This password reset link is invalid or has expired. <Link to="/forgot-password" className="underline underline-offset-2">Request a new one.</Link></p>}
      {error && <p role="alert" className="rounded-md border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-300">{error}</p>}
      {linkValid && !updated && <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="reset-password" className="block text-sm text-white/70">New password</label>
          <input id="reset-password" required minLength={6} name="password" type="password" autoComplete="new-password" placeholder="Enter a new password" className="h-11 w-full rounded-md border border-white/[0.08] bg-white/[0.08] px-3 text-sm text-white placeholder:text-white/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/40" />
        </div>
        <div className="space-y-2">
          <label htmlFor="reset-confirm-password" className="block text-sm text-white/70">Confirm new password</label>
          <input id="reset-confirm-password" required minLength={6} name="confirm-password" type="password" autoComplete="new-password" placeholder="Enter the new password again" className="h-11 w-full rounded-md border border-white/[0.08] bg-white/[0.08] px-3 text-sm text-white placeholder:text-white/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/40" />
        </div>
        <Button type="submit" disabled={submitting} className="w-full bg-white text-black hover:bg-neutral-200 hover:text-black dark:hover:bg-neutral-200 dark:hover:text-black">
          {submitting ? "Updating password…" : "Update password"}
        </Button>
      </form>}
    </AuthLayout>
  );
}
