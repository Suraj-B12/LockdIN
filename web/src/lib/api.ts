/* =====================================================================
   Typed fetch wrapper for the LockdIN API.
   - Base URL from VITE_API_BASE (default "/api").
   - Injects Authorization: Bearer <supabase access token>.
   - On 401: refresh the Supabase session ONCE, then retry the request.
   - Throws a typed ApiError carrying status + server `detail`.
   Mirrors the behavior of the old frontend/js/api.js.
   ===================================================================== */
import { getAccessToken, refreshSession } from "./supabase";

const API_BASE = (import.meta.env.VITE_API_BASE as string) || "/api";

export class ApiError extends Error {
  status: number;
  detail: string;
  constructor(status: number, detail: string) {
    super(detail || `API error: ${status}`);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

type Method = "GET" | "POST" | "PUT" | "DELETE";

interface RequestOptions {
  /** Internal flag — prevents infinite refresh loops. */
  _retried?: boolean;
  /** AbortSignal for cancellation (TanStack Query passes one). */
  signal?: AbortSignal;
}

async function request<T>(
  method: Method,
  path: string,
  body?: unknown,
  opts: RequestOptions = {}
): Promise<T> {
  const token = await getAccessToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const init: RequestInit = { method, headers, signal: opts.signal };
  if (body !== undefined && (method === "POST" || method === "PUT")) {
    init.body = JSON.stringify(body);
  }

  const res = await fetch(`${API_BASE}${path}`, init);

  // Token expired → refresh once and retry.
  if (res.status === 401 && !opts._retried) {
    const refreshed = await refreshSession();
    if (refreshed) {
      return request<T>(method, path, body, { ...opts, _retried: true });
    }
    throw new ApiError(401, "Session expired. Please sign in again.");
  }

  if (res.status === 204) {
    return undefined as T;
  }

  if (!res.ok) {
    let detail = `API error: ${res.status}`;
    try {
      const data = await res.json();
      if (data?.detail) detail = typeof data.detail === "string" ? data.detail : JSON.stringify(data.detail);
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(res.status, detail);
  }

  // Some endpoints (GET /sessions/active) can legitimately return null.
  const text = await res.text();
  if (!text) return null as T;
  return JSON.parse(text) as T;
}

export const api = {
  get: <T>(path: string, opts?: RequestOptions) => request<T>("GET", path, undefined, opts),
  post: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>("POST", path, body, opts),
  put: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>("PUT", path, body, opts),
  delete: <T>(path: string, opts?: RequestOptions) => request<T>("DELETE", path, undefined, opts),
};

export { API_BASE };
