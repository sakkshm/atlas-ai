const API_BASE = "/api/v1";

export function login() {
  window.location.href = `${API_BASE}/auth/google/login`;
}

export async function getMe(token: string) {
  const res = await fetch(`${API_BASE}/auth/me`, {
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
  const res = await fetch(`${API_BASE}/sessions`, { headers: authHeaders(token) });
  if (!res.ok) throw new Error("Failed to list sessions");
  return res.json();
}

export async function createSession(token: string, title = "New chat", id?: string): Promise<Session> {
  const res = await fetch(`${API_BASE}/sessions`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ title, id }),
  });
  if (!res.ok) throw new Error("Failed to create session");
  return res.json();
}

export async function getSession(token: string, sessionId: string): Promise<SessionDetail> {
  const res = await fetch(`${API_BASE}/sessions/${sessionId}`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("Session not found");
  return res.json();
}

export async function deleteSession(token: string, sessionId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/sessions/${sessionId}`, {
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
  const res = await fetch(`${API_BASE}/user/settings`, { headers: authHeaders(token) });
  if (!res.ok) throw new Error("Failed to get settings");
  return res.json();
}

export async function updateUserSettings(
  token: string,
  settings: Partial<UserSettings>
): Promise<UserSettings> {
  const res = await fetch(`${API_BASE}/user/settings`, {
    method: "PUT",
    headers: authHeaders(token),
    body: JSON.stringify(settings),
  });
  if (!res.ok) throw new Error("Failed to update settings");
  return res.json();
}
