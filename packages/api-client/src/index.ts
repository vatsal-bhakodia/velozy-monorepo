import type { ApiError } from "@velozy/contracts";

type TokenProvider = () => Promise<string | null>;

export class ApiClient {
  constructor(
    private readonly baseUrl: string,
    private readonly getToken?: TokenProvider,
  ) {}

  async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const token = await this.getToken?.();
    const headers = new Headers(init.headers);
    if (!(init.body instanceof FormData) && !headers.has("content-type")) {
      headers.set("content-type", "application/json");
    }
    if (token) headers.set("authorization", `Bearer ${token}`);
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers,
    });
    if (!response.ok) throw (await response.json()) as ApiError;
    return response.json() as Promise<T>;
  }
}
