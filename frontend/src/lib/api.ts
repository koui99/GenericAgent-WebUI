export class ApiError extends Error {
  status: number;
  body: string;
  constructor(status: number, body: string) {
    super(`API ${status}: ${body || 'request failed'}`);
    this.status = status;
    this.body = body;
  }
}

export async function apiFetch<T = unknown>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new ApiError(res.status, body);
  }
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  if (!text) return undefined as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    return text as unknown as T;
  }
}

export const api = {
  get: <T>(p: string) => apiFetch<T>(p),
  post: <T>(p: string, body?: unknown) =>
    apiFetch<T>(p, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(p: string, body?: unknown) =>
    apiFetch<T>(p, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  delete: <T = void>(p: string) => apiFetch<T>(p, { method: 'DELETE' }),
};
