import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/src/lib/auth";
import { apiFetch } from "@/src/lib/api";
import { ONBOARDING_AUTH_PENDING_KEY } from "@/src/onboard/storage-keys";

export default function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function complete() {
      const result = await supabase.auth.getSession();
      if (cancelled) return;
      if (result.error || !result.data.session) {
        setError(result.error?.message ?? "Authentication could not be completed.");
        return;
      }
      try {
        const accepted = await apiFetch("/api/admin/projects/team/accept", { method: "POST" });
        if (!accepted.ok) throw new Error("Could not accept your project invitation.");
        if (localStorage.getItem(ONBOARDING_AUTH_PENDING_KEY) === "1") {
          navigate("/onboard", { replace: true });
          return;
        }
        const response = await apiFetch("/api/admin/projects");
        if (!response.ok) throw new Error("Could not load your projects.");
        const data = await response.json();
        if (!cancelled) navigate(data.projects?.length ? "/" : "/onboard", { replace: true });
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "Could not load your projects.");
      }
    }
    void complete();
    return () => { cancelled = true; };
  }, [navigate]);

  return <main className="grid min-h-screen place-items-center bg-neutral-950 p-6 text-white">
    {error ? <p role="alert">{error} <Link to="/signin" className="underline">Return to sign in</Link></p> : "Completing sign in…"}
  </main>;
}
