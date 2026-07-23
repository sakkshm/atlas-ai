import { useEffect, useState } from "react";
import { getMe, login, updateTimezone } from "@/lib/api";

export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  timezone: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (token) {
      localStorage.setItem("token", token);
      window.history.replaceState({}, "", "/app");
    }

    const stored = localStorage.getItem("token");
    if (stored) {
      getMe(stored)
        .then((u) => {
          setUser(u);
          const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
          if (u.timezone !== browserTz) {
            updateTimezone(stored, browserTz).catch(() => {});
            setUser({ ...u, timezone: browserTz });
          }
        })
        .catch(() => localStorage.removeItem("token"))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  function logout() {
    localStorage.removeItem("token");
    setUser(null);
  }

  return { user, loading, login, logout, isAuthenticated: !!user };
}
