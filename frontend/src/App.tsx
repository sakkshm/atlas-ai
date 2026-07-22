import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useTTS, unlockAudio } from "@/hooks/useTTS";
import { LoginButton } from "@/components/LoginButton";
import { UserBadge } from "@/components/UserBadge";
import { ChatMessage } from "@/components/ChatMessage";
import { VoiceBar } from "@/components/VoiceBar";

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
  search_contacts: "Searching contacts...",
  get_distance: "Checking distance...",
  get_directions: "Getting directions...",
  distance_matrix: "Checking distance...",
};

interface Message {
  role: "user" | "assistant" | "status";
  content: string;
}

function App() {
  const { user, loading, logout, isAuthenticated } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const token = localStorage.getItem("token");
  const sessionId = useRef(
    crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)
  ).current;

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

  const { status, lastMessage, send } = useWebSocket(
    sessionId,
    isAuthenticated ? token : null,
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
    } else if (lastMessage.type === "status" && lastMessage.message) {
      setMessages((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last?.role === "status") {
          next[next.length - 1] = {
            role: "status",
            content: lastMessage.message!,
          };
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
        next.push({
          role: "assistant",
          content: lastMessage.message || "Something went wrong.",
        });
        return next;
      });
      setIsProcessing(false);
    }
  }, [lastMessage]);

  const handleSendText = useCallback(
    (text: string) => {
      unlockAudio();
      setMessages((prev) => [
        ...prev.filter((m) => m.role !== "status"),
        { role: "user", content: text },
      ]);
      setIsProcessing(true);
      send({ type: "text", data: text });
    },
    [send]
  );

  const handleSendAudio = useCallback(
    (base64: string) => {
      unlockAudio();
      setIsProcessing(true);
      send({ type: "audio", data: base64 });
    },
    [send]
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <div className="text-zinc-400">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-medium mb-4">Atlas AI</h1>
          <LoginButton />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-white">
      <header className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <h1 className="text-lg font-medium">Atlas AI</h1>
        {user && (
          <UserBadge
            name={user.name}
            email={user.email}
            avatar_url={user.avatar_url}
            onLogout={logout}
          />
        )}
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-4 scrollbar-hidden max-w-3xl mx-auto w-full">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-zinc-500 text-sm">
              Start a conversation with voice or text
            </p>
          </div>
        ) : (
          <>
            {messages.map((msg, i) => (
              <ChatMessage key={i} role={msg.role} content={msg.content} />
            ))}
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
    </div>
  );
}

export default App;
