const DEFAULT_TIMEOUT_MS = 25000;

export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit & { timeoutMs?: number },
): Promise<Response> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, ...fetchInit } = init ?? {};
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...fetchInit, signal: controller.signal });
  } finally {
    window.clearTimeout(timer);
  }
}

export async function requestJson<T>(
  apiBase: string,
  path: string,
  init?: RequestInit & { timeoutMs?: number },
): Promise<{ data: T | null; status: number; error?: string }> {
  try {
    const response = await fetchWithTimeout(`${apiBase}${path}`, {
      credentials: 'include',
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
    });
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      return { data: null, status: response.status, error: payload?.error };
    }
    const data = (await response.json()) as T;
    return { data, status: response.status };
  } catch (error) {
    const message =
      error instanceof DOMException && error.name === 'AbortError'
        ? '请求超时，服务器可能正在唤醒，请稍后重试'
        : 'Network error';
    return { data: null, status: 0, error: message };
  }
}
