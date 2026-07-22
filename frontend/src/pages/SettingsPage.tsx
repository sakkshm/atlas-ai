import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useSettings } from "@/hooks/useSettings";
import { useTheme } from "@/hooks/useTheme";
import type { User } from "@/hooks/useAuth";

const TTS_VOICES = [
  { value: "shubh", label: "Shubh (Male)" },
  { value: "meera", label: "Meera (Female)" },
  { value: "arvind", label: "Arvind (Male)" },
  { value: "vallari", label: "Vallari (Female)" },
  { value: "amolika", label: "Amolika (Female)" },
];

const STT_LANGUAGES = [
  { value: "unknown", label: "Auto-detect" },
  { value: "en-IN", label: "English" },
  { value: "hi-IN", label: "Hindi" },
  { value: "bn-IN", label: "Bengali" },
  { value: "gu-IN", label: "Gujarati" },
  { value: "kn-IN", label: "Kannada" },
  { value: "ml-IN", label: "Malayalam" },
  { value: "mr-IN", label: "Marathi" },
  { value: "od-IN", label: "Odia" },
  { value: "pa-IN", label: "Punjabi" },
  { value: "ta-IN", label: "Tamil" },
  { value: "te-IN", label: "Telugu" },
];

interface SettingsPageProps {
  token: string;
  user: User;
  onLogout: () => void;
}

export function SettingsPage({ token, user, onLogout }: SettingsPageProps) {
  const navigate = useNavigate();
  const { settings, update } = useSettings(token);
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-xl mx-auto px-4 py-6 space-y-8">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon-sm" onClick={() => navigate("/")}>
            <ArrowLeft className="size-4" />
          </Button>
          <h1 className="text-lg font-semibold">Settings</h1>
        </div>

        <section className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground">Account</h2>
          <div className="flex items-center gap-3 p-3 rounded-lg border border-border">
            {user.avatar_url ? (
              <img src={user.avatar_url} alt={user.name} className="w-10 h-10 rounded-full" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                {user.name[0]}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium">{user.name}</div>
              <div className="text-xs text-muted-foreground">{user.email}</div>
            </div>
            <Button variant="ghost" size="sm" onClick={onLogout}>
              Sign out
            </Button>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground">Appearance</h2>
          <div className="flex items-center justify-between p-3 rounded-lg border border-border">
            <div>
              <div className="text-sm font-medium">Theme</div>
              <div className="text-xs text-muted-foreground">Switch between dark and light mode</div>
            </div>
            <Button variant="outline" size="sm" onClick={toggleTheme}>
              {theme === "dark" ? "Light" : "Dark"}
            </Button>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground">Voice (TTS)</h2>

          <div className="flex items-center justify-between p-3 rounded-lg border border-border">
            <div>
              <div className="text-sm font-medium">Voice replies</div>
              <div className="text-xs text-muted-foreground">Play audio responses after each message</div>
            </div>
            <button
              onClick={() => update({ tts_enabled: !settings.tts_enabled })}
              className={`
                relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border border-transparent
                transition-colors duration-200 ease-in-out
                ${settings.tts_enabled ? "bg-primary" : "bg-muted"}
              `}
            >
              <span
                className={`
                  pointer-events-none inline-block size-4 rounded-full bg-background shadow-lg
                  transition-transform duration-200 ease-in-out mt-px
                  ${settings.tts_enabled ? "translate-x-4" : "translate-x-0"}
                `}
              />
            </button>
          </div>

          <div className="p-3 rounded-lg border border-border space-y-2">
            <div className="text-sm font-medium">Voice</div>
            <div className="text-xs text-muted-foreground">Choose the voice for audio replies</div>
            <select
              value={settings.tts_voice}
              onChange={(e) => update({ tts_voice: e.target.value })}
              className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm outline-none focus:border-ring"
            >
              {TTS_VOICES.map((v) => (
                <option key={v.value} value={v.value}>
                  {v.label}
                </option>
              ))}
            </select>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground">Transcription (STT)</h2>
          <div className="p-3 rounded-lg border border-border space-y-2">
            <div className="text-sm font-medium">Language</div>
            <div className="text-xs text-muted-foreground">Language for voice input transcription</div>
            <select
              value={settings.stt_language}
              onChange={(e) => update({ stt_language: e.target.value })}
              className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm outline-none focus:border-ring"
            >
              {STT_LANGUAGES.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>
        </section>
      </div>
    </div>
  );
}
