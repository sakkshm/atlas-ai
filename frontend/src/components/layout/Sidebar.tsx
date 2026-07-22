import { useNavigate, useParams } from "react-router-dom";
import { MessageSquare, Plus, Settings, LogOut, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSessions } from "@/hooks/useSessions";
import type { User } from "@/hooks/useAuth";

interface SidebarProps {
  token: string;
  user: User;
  onLogout: () => void;
  open: boolean;
  onClose: () => void;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function Sidebar({ token, user, onLogout, open, onClose }: SidebarProps) {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { sessions } = useSessions(token);

  function handleNewChat() {
    navigate("/app");
    onClose();
  }

  function handleSelectSession(id: string) {
    navigate(`/app/c/${id}`);
    onClose();
  }

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed top-0 left-0 z-50 h-full w-72 glass border-r border-white/[0.08]
          flex flex-col transition-transform duration-200
          lg:relative lg:translate-x-0 lg:z-auto
          ${open ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.08] shrink-0">
          <h1 className="font-heading text-lg tracking-[0.01em]">Atlas AI</h1>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            className="lg:hidden"
          >
            <ChevronLeft className="size-4" />
          </Button>
        </div>

        <div className="p-2 shrink-0">
          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            onClick={handleNewChat}
          >
            <Plus className="size-4" />
            New chat
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-2 scrollbar-hidden">
          {sessions.map((s) => (
            <button
              key={s.id}
              onClick={() => handleSelectSession(s.id)}
              className={`
                w-full text-left px-3 py-2 rounded-lg text-sm transition-colors group
                ${
                  s.id === sessionId
                    ? "bg-white/[0.06] text-foreground"
                    : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground"
                }
              `}
            >
              <div className="flex items-center gap-2">
                <MessageSquare className="size-3.5 shrink-0 opacity-40" />
                <span className="truncate flex-1">{s.title}</span>
                <span className="text-[10px] opacity-0 group-hover:opacity-100 transition-opacity shrink-0 text-muted-foreground">
                  {timeAgo(s.updated_at)}
                </span>
              </div>
            </button>
          ))}
        </div>

        <div className="border-t border-white/[0.08] p-3 shrink-0">
          <div className="flex items-center gap-2">
            {user.avatar_url ? (
              <img src={user.avatar_url} alt={user.name} className="w-7 h-7 rounded-full" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-white/[0.06] flex items-center justify-center text-xs font-medium">
                {user.name[0]}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium truncate">{user.name}</div>
              <div className="text-[10px] text-muted-foreground truncate">{user.email}</div>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => { navigate("/app/settings"); onClose(); }}
              title="Settings"
            >
              <Settings className="size-3.5" />
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={onLogout} title="Sign out">
              <LogOut className="size-3.5" />
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
}
