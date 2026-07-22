import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";

import { toast } from "sonner";
import { useWebSocket, type WSStatus } from "@/hooks/useWebSocket";
import { useTTS, unlockAudio } from "@/hooks/useTTS";
import { ChatMessage } from "@/components/ChatMessage";
import { ToolCard } from "@/components/ToolCard";
import { VoiceBar } from "@/components/VoiceBar";
import { getSession, createSession } from "@/lib/api";

const TOOL_LABELS: Record<string, string> = {
  list_calendar_events: "Checking your calendar...",
  create_calendar_event: "Creating calendar event...",
  update_calendar_event: "Updating calendar event...",
  delete_calendar_event: "Deleting calendar event...",
  list_tasks: "Checking your tasks...",
  create_task: "Creating task...",
  complete_task: "Completing task...",
  delete_task: "Deleting task...",
  send_email: "Sending email...",
  draft_email: "Drafting email...",
  list_emails: "Checking your inbox...",
  read_email: "Reading email...",
  search_contacts: "Searching contacts...",
  get_distance: "Checking distance...",
  get_directions: "Getting directions...",
  distance_matrix: "Checking distance...",
};

interface Message {
  role: "user" | "assistant" | "status" | "card" | "error";
  content: string;
  card?: any;
  code?: string;
}

interface ChatPageProps {
  token: string;
}

export function ChatPage({ token }: ChatPageProps) {
  const { sessionId: urlSessionId } = useParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [authExpired, setAuthExpired] = useState(false);
  const [hitlPending, setHitlPending] = useState<string | null>(null);
  const [rateLimitedUntil, setRateLimitedUntil] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasCreatedSession = useRef(false);
  const newSessionId = useRef(crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)).current;

  const wsSessionId = urlSessionId ?? newSessionId;

  const tts = useTTS();
  const ttsRef = useRef(tts);
  ttsRef.current = tts;

  useEffect(() => {
    const handler = () => unlockAudio();
    document.addEventListener("click", handler, { once: true });
    document.addEventListener("keydown", handler, { once: true });
    return () => {
      document.removeEventListener("click", handler);
      document.removeEventListener("keydown", handler);
    };
  }, []);

  useEffect(() => {
    if (urlSessionId) {
      setMessages([]);
      setLoadingHistory(true);
      hasCreatedSession.current = true;
      getSession(token, urlSessionId)
        .then((session) => {
          const restored: Message[] = session.messages.map((m) => ({
            role: m.role as "user" | "assistant" | "card",
            content: m.content,
            card: m.role === "card" ? JSON.parse(m.content) : undefined,
          }));
          setMessages(restored);
        })
        .catch(() => {})
        .finally(() => setLoadingHistory(false));
    } else {
      setMessages([]);
      hasCreatedSession.current = false;
    }
  }, [urlSessionId, token]);

  const { status, lastMessage, send } = useWebSocket(
    wsSessionId,
    token,
    {
      onBinaryChunk: (chunk) => ttsRef.current.pushChunk(chunk),
      onMessage: (msg) => {
        const t = ttsRef.current;
        if (msg.type === "tts_start") {
          t.clearChunks();
          setMessages((prev) => {
            const next = prev.filter((m) => m.role !== "status");
            next.push({ role: "status", content: "Replying..." });
            return next;
          });
        } else if (msg.type === "tts_end") {
          t.flush();
        } else if (msg.type === "hitl_request") {
          setHitlPending(msg.text ?? null);
          setMessages((prev) => {
            const next = prev.filter((m) => m.role !== "status");
            return next;
          });
        }
      },
      onAuthExpired: () => {
        setAuthExpired(true);
        toast.error("Session expired", {
          description: "Please sign in again.",
          action: {
            label: "Sign in",
            onClick: () => {
              localStorage.removeItem("token");
              window.location.href = "/api/v1/auth/google/login";
            },
          },
          duration: Infinity,
        });
      },
    }
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (status === "connected") {
      setIsProcessing(false);
    }
  }, [status]);

  const prevStatus = useRef<WSStatus>(status);
  useEffect(() => {
    if (prevStatus.current === "disconnected" && status === "connected") {
      toast.success("Reconnected");
    }
    prevStatus.current = status;
  }, [status]);

  useEffect(() => {
    if (!isProcessing) return;
    const timeout = setTimeout(() => setIsProcessing(false), 30000);
    return () => clearTimeout(timeout);
  }, [isProcessing]);

  useEffect(() => {
    if (!rateLimitedUntil) return;
    const remaining = rateLimitedUntil - Date.now();
    if (remaining <= 0) {
      setRateLimitedUntil(null);
      return;
    }
    const timeout = setTimeout(() => setRateLimitedUntil(null), remaining);
    return () => clearTimeout(timeout);
  }, [rateLimitedUntil]);

  useEffect(() => {
    if (!lastMessage) return;

    if (lastMessage.type === "transcription" && lastMessage.text) {
      setMessages((prev) => {
        const next = prev.filter((m) => m.role !== "status");
        next.push({ role: "user", content: lastMessage.text! });
        return next;
      });
    } else if (lastMessage.type === "tool_start" && lastMessage.name) {
      const label = TOOL_LABELS[lastMessage.name] || "Working...";
      setMessages((prev) => {
        const next = prev.filter((m) => m.role !== "status");
        next.push({ role: "status", content: label });
        return next;
      });
    } else if (lastMessage.type === "tool_end") {
      setMessages((prev) => {
        const next = prev.filter((m) => m.role !== "status");
        next.push({ role: "status", content: "Thinking..." });
        return next;
      });
    } else if (lastMessage.type === "tool_result" && (lastMessage as any).card) {
      setMessages((prev) => {
        const next = prev.filter((m) => m.role !== "status");
        next.push({ role: "card", content: "", card: (lastMessage as any).card });
        return next;
      });
    } else if (lastMessage.type === "status" && lastMessage.message) {
      setMessages((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last?.role === "status") {
          next[next.length - 1] = { role: "status", content: lastMessage.message! };
        } else {
          next.push({ role: "status", content: lastMessage.message! });
        }
        return next;
      });
    } else if (lastMessage.type === "response" && lastMessage.text) {
      setHitlPending(null);
      setMessages((prev) => {
        const next = prev.filter((m) => m.role !== "status");
        next.push({ role: "assistant", content: lastMessage.text! });
        return next;
      });
      setIsProcessing(false);
    } else if (lastMessage.type === "error") {
      const code = lastMessage.code;
      const text = lastMessage.message || "Something went wrong.";

      if (code === "rate_limited") {
        const retryAfter = lastMessage.retry_after || 30;
        setRateLimitedUntil(Date.now() + retryAfter * 1000);
        setMessages((prev) => {
          const next = prev.filter((m) => m.role !== "status");
          next.push({ role: "error", content: `Please wait ${retryAfter} seconds before sending another message.`, code });
          return next;
        });
      } else if (code === "auth_expired") {
        setAuthExpired(true);
        setMessages((prev) => {
          const next = prev.filter((m) => m.role !== "status");
          next.push({ role: "error", content: text, code });
          return next;
        });
        toast.error("Google account access expired", {
          description: "Please reconnect your Google account.",
          action: {
            label: "Reconnect",
            onClick: () => {
              localStorage.removeItem("token");
              window.location.href = "/api/v1/auth/google/login";
            },
          },
          duration: Infinity,
        });
      } else if (code === "busy") {
        setMessages((prev) => {
          const next = prev.filter((m) => m.role !== "status");
          next.push({ role: "error", content: text, code });
          return next;
        });
      } else {
        setMessages((prev) => {
          const next = prev.filter((m) => m.role !== "status");
          next.push({ role: "error", content: text, code });
          return next;
        });
      }

      setIsProcessing(false);
    }
  }, [lastMessage]);

  const handleSendText = useCallback(
    async (text: string) => {
      unlockAudio();
      setMessages((prev) => [
        ...prev.filter((m) => m.role !== "status"),
        { role: "user", content: text },
      ]);
      setIsProcessing(true);
      setHitlPending(null);

      if (!hasCreatedSession.current) {
        hasCreatedSession.current = true;
        try {
          const title = text.length > 50 ? text.slice(0, 50) + "..." : text;
          await createSession(token, title, wsSessionId);
          window.history.replaceState({}, "", `/app/c/${wsSessionId}`);
          window.dispatchEvent(new Event("session-created"));
        } catch {}
      }

      send({ type: "text", data: text });
    },
    [send, wsSessionId, token]
  );

  const handleHitlResponse = useCallback(
    (confirmed: boolean) => {
      const text = confirmed ? "yes" : "no, cancel";
      handleSendText(text);
    },
    [handleSendText]
  );

  const handleSendAudio = useCallback(
    (base64: string) => {
      unlockAudio();
      setIsProcessing(true);
      send({ type: "audio", data: base64 });
    },
    [send]
  );

  const isInputDisabled = status !== "connected" || isProcessing || !!hitlPending || !!rateLimitedUntil;

  if (loadingHistory) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-muted-foreground text-sm">Loading conversation...</div>
      </div>
    );
  }

  return (
    <>
      {status === "disconnected" && !authExpired && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
            <p className="text-sm text-muted-foreground">Connection lost — reconnecting...</p>
          </div>
        </div>
      )}

      <main className="flex-1 overflow-y-auto px-4 py-4 scrollbar-hidden max-w-3xl mx-auto w-full">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-2">
              <p className="text-muted-foreground text-sm">
                Start a conversation with voice or text
              </p>
            </div>
          </div>
        ) : (
            messages.map((msg, i) => {
              const prevRole = i > 0 ? messages[i - 1].role : null;
              const prevSide = prevRole === "user" ? "user" : "assistant";
              const curSide = msg.role === "user" ? "user" : "assistant";
              const crossSide = prevRole !== null && prevSide !== curSide;
              const spacing = crossSide ? "mt-6" : "mt-1";

              if (msg.role === "card" && msg.card) {
                return <ToolCard key={i} card={msg.card} className={spacing} />;
              }

              if (msg.role === "error") {
                return (
                  <div key={i} className={`${spacing} flex justify-center`}>
                    <div className="glass rounded-xl px-4 py-2.5 max-w-[80%] border border-amber-500/20">
                      <p className="text-[13px] text-amber-400/90 leading-relaxed">{msg.content}</p>
                    </div>
                  </div>
                );
              }

              return <ChatMessage key={i} role={msg.role as any} content={msg.content} className={spacing} />;
            })
        )}
        <div ref={messagesEndRef} />
      </main>

      {hitlPending && (
        <div className="max-w-3xl mx-auto w-full px-4 pb-2 fade-in">
          <div className="glass rounded-2xl px-5 py-4 border border-white/[0.08]">
            <p className="text-[13px] text-muted-foreground mb-3 leading-relaxed">{hitlPending}</p>
            <div className="flex gap-2">
              <button
                onClick={() => handleHitlResponse(true)}
                className="flex-1 rounded-xl bg-emerald-500/20 text-emerald-400 text-sm font-medium py-2.5 hover:bg-emerald-500/30 transition-colors"
              >
                Confirm
              </button>
              <button
                onClick={() => handleHitlResponse(false)}
                className="flex-1 rounded-xl bg-white/[0.06] text-muted-foreground text-sm font-medium py-2.5 hover:bg-white/[0.1] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {rateLimitedUntil && (
        <div className="max-w-3xl mx-auto w-full px-4 pb-2">
          <div className="text-center text-xs text-amber-400/70">
            Rate limited — wait {Math.ceil((rateLimitedUntil - Date.now()) / 1000)}s
          </div>
        </div>
      )}

      <div className="max-w-3xl mx-auto w-full">
        <VoiceBar
          onSendText={handleSendText}
          onSendAudio={handleSendAudio}
          disabled={isInputDisabled}
        />
      </div>
    </>
  );
}
