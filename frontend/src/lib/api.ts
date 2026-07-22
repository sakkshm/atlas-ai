const API_BASE = "/api/v1";

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

export class RateLimitError extends Error {
  retryAfter: number;
  constructor(message: string, retryAfter: number) {
    super(message);
    this.name = "RateLimitError";
    this.retryAfter = retryAfter;
  }
}

export class AuthExpiredError extends Error {
  constructor(message = "Session expired. Please sign in again.") {
    super(message);
    this.name = "AuthExpiredError";
  }
}

async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retries = MAX_RETRIES
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, options);

      if (res.status === 429) {
        const retryAfter = parseInt(res.headers.get("Retry-After") || "30", 10);
        throw new RateLimitError("Too many requests", retryAfter);
      }

      if (res.status === 401) {
        throw new AuthExpiredError();
      }

      if (res.ok || res.status < 500 || attempt === retries) {
        return res;
      }

      lastError = new Error(`Server error (${res.status})`);
    } catch (e) {
      if (e instanceof RateLimitError || e instanceof AuthExpiredError) {
        throw e;
      }
      lastError = e as Error;
      if (attempt === retries) break;
    }

    await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * (attempt + 1)));
  }

  throw lastError || new Error("Network error");
}

export function login() {
  window.location.href = `${API_BASE}/auth/google/login`;
}

export async function getMe(token: string) {
  const res = await fetchWithRetry(`${API_BASE}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Not authenticated");
  return res.json();
}

export interface Session {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface SessionDetail extends Session {
  messages: { role: string; content: string }[];
}

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

export async function listSessions(token: string): Promise<Session[]> {
  const res = await fetchWithRetry(`${API_BASE}/sessions`, { headers: authHeaders(token) });
  if (!res.ok) throw new Error("Failed to list sessions");
  return res.json();
}

export async function createSession(token: string, title = "New chat", id?: string): Promise<Session> {
  const res = await fetchWithRetry(`${API_BASE}/sessions`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ title, id }),
  });
  if (!res.ok) throw new Error("Failed to create session");
  return res.json();
}

export async function getSession(token: string, sessionId: string): Promise<SessionDetail> {
  const res = await fetchWithRetry(`${API_BASE}/sessions/${sessionId}`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("Session not found");
  return res.json();
}

export async function deleteSession(token: string, sessionId: string): Promise<void> {
  const res = await fetchWithRetry(`${API_BASE}/sessions/${sessionId}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("Failed to delete session");
}

export interface UserSettings {
  tts_enabled: boolean;
  tts_voice: string;
  stt_language: string;
}

export async function getUserSettings(token: string): Promise<UserSettings> {
  const res = await fetchWithRetry(`${API_BASE}/user/settings`, { headers: authHeaders(token) });
  if (!res.ok) throw new Error("Failed to get settings");
  return res.json();
}

export async function updateUserSettings(
  token: string,
  settings: Partial<UserSettings>
): Promise<UserSettings> {
  const res = await fetchWithRetry(`${API_BASE}/user/settings`, {
    method: "PUT",
    headers: authHeaders(token),
    body: JSON.stringify(settings),
  });
  if (!res.ok) throw new Error("Failed to update settings");
  return res.json();
}
