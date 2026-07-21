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
