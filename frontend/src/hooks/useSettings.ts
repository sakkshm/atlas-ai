import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { getUserSettings, updateUserSettings, type UserSettings } from "@/lib/api";

const CACHE_KEY = "user_settings";
const defaults: UserSettings = { tts_enabled: true, tts_voice: "shubh", stt_language: "unknown" };

function loadCache(): UserSettings {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? { ...defaults, ...JSON.parse(raw) } : defaults;
  } catch {
    return defaults;
  }
}

export function useSettings(token: string | null) {
  const [settings, setSettings] = useState<UserSettings>(loadCache);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    getUserSettings(token)
      .then((data) => {
        setSettings(data);
        localStorage.setItem(CACHE_KEY, JSON.stringify(data));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  const update = useCallback(
    async (patch: Partial<UserSettings>) => {
      if (!token) return;
      const previous = settings;
      setSettings((prev) => {
        const next = { ...prev, ...patch };
        localStorage.setItem(CACHE_KEY, JSON.stringify(next));
        return next;
      });
      try {
        const updated = await updateUserSettings(token, patch);
        setSettings(updated);
        localStorage.setItem(CACHE_KEY, JSON.stringify(updated));
      } catch {
        setSettings(previous);
        localStorage.setItem(CACHE_KEY, JSON.stringify(previous));
        toast.error("Failed to save settings");
      }
    },
    [token, settings]
  );

  return { settings, loading, update };
}
