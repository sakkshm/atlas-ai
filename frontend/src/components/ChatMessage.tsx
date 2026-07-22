import { Loader2 } from "lucide-react";
import Markdown from "react-markdown";

interface ChatMessageProps {
  role: "user" | "assistant" | "status";
  content: string;
}

export function ChatMessage({ role, content }: ChatMessageProps) {
  if (role === "status") {
    const alignRight = content === "Transcribing...";
    return (
      <div className={`flex ${alignRight ? "justify-end" : "justify-start"} mb-3`}>
        <div className="flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm text-muted-foreground bg-muted/50 border border-border">
          <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
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
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-foreground border border-border"
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
                  <code className="block bg-muted rounded-md px-3 py-2 my-2 text-xs overflow-x-auto">{children}</code>
                ) : (
                  <code className="bg-muted rounded px-1.5 py-0.5 text-xs">{children}</code>
                );
              },
              a: ({ children, href }) => (
                <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-500 dark:text-blue-400 hover:underline">{children}</a>
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
