import { useEffect, useState } from "react";
import { getMe, login } from "@/lib/api";

interface User {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (token) {
      localStorage.setItem("token", token);
      window.history.replaceState({}, "", "/");
    }

    const stored = localStorage.getItem("token");
    if (stored) {
      getMe(stored)
        .then(setUser)
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
