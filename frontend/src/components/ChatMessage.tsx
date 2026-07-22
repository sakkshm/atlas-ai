import { Loader2 } from "lucide-react";
import Markdown from "react-markdown";

interface ChatMessageProps {
  role: "user" | "assistant" | "status";
  content: string;
  className?: string;
}

export function ChatMessage({ role, content, className = "" }: ChatMessageProps) {
  if (role === "status") {
    const alignRight = content === "Transcribing...";
    return (
      <div className={`flex ${alignRight ? "justify-end" : "justify-start"} mb-2 ${className}`}>
        <div className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground glass">
          <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
          <span>{content}</span>
        </div>
      </div>
    );
  }

  const isUser = role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} fade-in ${className}`}>
      <div
        className={`max-w-[60%] rounded-xl px-3 py-2 text-sm leading-relaxed ${
          isUser
            ? "bg-white text-black"
            : "glass text-foreground"
        }`}
      >
        {isUser ? (
          content
        ) : (
          <Markdown
            components={{
              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
              ul: ({ children }) => <ul className="list-disc pl-4 mb-2 last:mb-0">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 last:mb-0">{children}</ol>,
              li: ({ children }) => <li className="mb-0.5">{children}</li>,
              strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
              em: ({ children }) => <em className="italic">{children}</em>,
              code: ({ children, className }) => {
                const isBlock = className?.includes("language-");
                return isBlock ? (
                  <code className="block bg-white/[0.06] rounded px-3 py-2 my-2 text-xs overflow-x-auto">{children}</code>
                ) : (
                  <code className="bg-white/[0.06] rounded px-1.5 py-0.5 text-xs">{children}</code>
                );
              },
              a: ({ children, href }) => (
                <a href={href} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">{children}</a>
              ),
            }}
          >
            {content}
          </Markdown>
        )}
      </div>
    </div>
  );
}
