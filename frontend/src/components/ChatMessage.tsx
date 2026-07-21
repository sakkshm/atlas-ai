import { Loader2 } from "lucide-react";

interface ChatMessageProps {
  role: "user" | "assistant" | "status";
  content: string;
}

export function ChatMessage({ role, content }: ChatMessageProps) {
  if (role === "status") {
    const alignRight = content === "Transcribing...";
    return (
      <div className={`flex ${alignRight ? "justify-end" : "justify-start"} mb-3`}>
        <div className="flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm text-zinc-400 bg-zinc-900/50 border border-zinc-800/50">
          <Loader2 className="size-3.5 animate-spin text-zinc-500" />
          <span>{content}</span>
        </div>
      </div>
    );
  }

  const isUser = role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3`}>
      <div
        className={`max-w-[45%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isUser
            ? "bg-zinc-800 text-zinc-100"
            : "bg-zinc-900 text-zinc-200 border border-zinc-800"
        }`}
      >
        {content}
      </div>
    </div>
  );
}
