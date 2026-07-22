import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { listSessions, createSession, deleteSession, type Session } from "@/lib/api";

export function useSessions(token: string | null) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await listSessions(token);
      setSessions(data);
    } catch (e: any) {
      if (e?.name !== "AuthExpiredError") {
        toast.error("Failed to load conversations");
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const handler = () => refresh();
    window.addEventListener("session-created", handler);
    return () => window.removeEventListener("session-created", handler);
  }, [refresh]);

  const addSession = useCallback(
    async (title?: string) => {
      if (!token) return null;
      try {
        const session = await createSession(token, title);
        setSessions((prev) => [session, ...prev]);
        return session;
      } catch (e: any) {
        toast.error("Failed to create conversation");
        return null;
      }
    },
    [token]
  );

  const removeSession = useCallback(
    async (sessionId: string) => {
      if (!token) return;
      try {
        await deleteSession(token, sessionId);
        setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      } catch (e: any) {
        toast.error("Failed to delete conversation");
      }
    },
    [token]
  );

  return { sessions, loading, refresh, addSession, removeSession };
}
