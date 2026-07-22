import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useWebSocket } from "@/hooks/useWebSocket";
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
  role: "user" | "assistant" | "status" | "card";
  content: string;
  card?: any;
}

interface ChatPageProps {
  token: string;
}

export function ChatPage({ token }: ChatPageProps) {
  const { sessionId: urlSessionId } = useParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
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
          setMessages((prev) => prev.filter((m) => m.role !== "status"));
          setIsProcessing(false);
        }
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

  useEffect(() => {
    if (!isProcessing) return;
    const timeout = setTimeout(() => setIsProcessing(false), 30000);
    return () => clearTimeout(timeout);
  }, [isProcessing]);

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
      setMessages((prev) => {
        const next = prev.filter((m) => m.role !== "status");
        next.push({ role: "assistant", content: lastMessage.text! });
        return next;
      });
    } else if (lastMessage.type === "error") {
      setMessages((prev) => {
        const next = prev.filter((m) => m.role !== "status");
        next.push({ role: "assistant", content: lastMessage.message || "Something went wrong." });
        return next;
      });
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

  const handleSendAudio = useCallback(
    (base64: string) => {
      unlockAudio();
      setIsProcessing(true);
      send({ type: "audio", data: base64 });
    },
    [send]
  );

  if (loadingHistory) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-muted-foreground text-sm">Loading conversation...</div>
      </div>
    );
  }

  return (
    <>
      <main className="flex-1 overflow-y-auto px-4 py-4 scrollbar-hidden max-w-3xl mx-auto w-full">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground text-sm">
              Start a conversation with voice or text
            </p>
          </div>
        ) : (
          <>
            {messages.map((msg, i) =>
              msg.role === "card" && msg.card ? (
                <ToolCard key={i} card={msg.card} />
              ) : (
                <ChatMessage key={i} role={msg.role as any} content={msg.content} />
              )
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </main>

      <div className="max-w-3xl mx-auto w-full">
        <VoiceBar
          onSendText={handleSendText}
          onSendAudio={handleSendAudio}
          disabled={status !== "connected" || isProcessing}
        />
      </div>
    </>
  );
}
