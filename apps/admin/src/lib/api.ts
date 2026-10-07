import { ApiClient } from "@velozy/api-client";
import { getAccessToken } from "@/src/lib/auth";
import { queryClient } from "@/src/lib/query-client";

export const API_BASE_URL = (import.meta.env.VITE_API_URL ?? "http://localhost:4000").replace(/\/$/, "");

export const adminApi = new ApiClient(API_BASE_URL, getAccessToken);

export function apiRequest<T>(path: string, init: RequestInit = {}) {
  return adminApi.request<T>(path, init);
}

export async function apiFetch(path: string, init: RequestInit = {}) {
  const token = await getAccessToken();
  const headers = new Headers(init.headers);
  if (token) headers.set("authorization", `Bearer ${token}`);
  const method = (init.method || "GET").toUpperCase();
  const shouldCache =
    method === "GET" &&
    init.cache !== "no-store" &&
    (/^\/api\/admin(?:\/|$)/.test(path) ||
      /^\/api\/pages\/data(?:\/|$)/.test(path));

  if (!shouldCache) {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers,
    });
    if (method !== "GET" && response.ok) {
      void queryClient.invalidateQueries({
        queryKey: ["admin-http"],
        refetchType: "none",
      });
    }
    return response;
  }

  const queryKey = ["admin-http", API_BASE_URL, path] as const;
  const cached = await queryClient.fetchQuery({
    queryKey,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    retry: false,
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}${path}`, {
        ...init,
        headers,
      });
      const body = await response.text();
      const responseHeaders = Array.from(response.headers.entries()).filter(
        ([name]) =>
          !["content-length", "content-encoding", "transfer-encoding"].includes(
            name.toLowerCase(),
          ),
      );
      return {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
        body,
      };
    },
  });

  if (cached.status >= 400) {
    queryClient.removeQueries({ queryKey, exact: true });
  }
  return new Response(
    cached.status === 204 || cached.status === 205 || cached.status === 304
      ? null
      : cached.body,
    {
      status: cached.status,
      statusText: cached.statusText,
      headers: cached.headers,
    },
  );
}
