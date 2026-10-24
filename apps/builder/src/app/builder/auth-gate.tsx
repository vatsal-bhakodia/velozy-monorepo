"use client";

import { createClient } from "@supabase/supabase-js";
import { useEffect, useState, type ReactNode } from "react";

export function BuilderAuthGate({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey) {
      setError(
        "Builder Supabase configuration is missing. Start the workspace with pnpm dev.",
      );
      return;
    }
    const supabase = createClient(url, anonKey);
    let active = true;
    const originalFetch = window.fetch.bind(window);
    window.fetch = async (input, init) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url;
      if (!url.startsWith("/api/")) return originalFetch(input, init);
      const { data } = await supabase.auth.getSession();
      const headers = new Headers(
        init?.headers ?? (input instanceof Request ? input.headers : undefined),
      );
      if (data.session?.access_token)
        headers.set("authorization", `Bearer ${data.session.access_token}`);
      return originalFetch(input, { ...init, headers });
    };

    void supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      if (!data.user) {
        window.location.assign(
          `/signin?next=${encodeURIComponent(window.location.pathname + window.location.search)}`,
        );
      } else {
        setReady(true);
      }
    });
    return () => {
      active = false;
      window.fetch = originalFetch;
    };
  }, []);

  return ready ? (
    children
  ) : (
    <main className="grid min-h-screen place-items-center">
      {error || "Opening builder…"}
    </main>
  );
}
