import { Mail, Inbox, MailOpen, User } from "lucide-react";

interface EmailDraftCardProps {
  card: {
    type: string;
    [key: string]: any;
  };
}

function relativeTime(dateStr: string): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const absDiff = Math.abs(diffMs);
    const past = diffMs > 0;
    if (absDiff < 60_000) return "just now";
    if (absDiff < 3_600_000) {
      const m = Math.floor(absDiff / 60_000);
      return past ? `${m}m ago` : `in ${m}m`;
    }
    if (absDiff < 86_400_000) {
      const h = Math.floor(absDiff / 3_600_000);
      return past ? `${h}h ago` : `in ${h}h`;
    }
    const days = Math.floor(absDiff / 86_400_000);
    if (days < 7) return past ? `${days}d ago` : `in ${days}d`;
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return dateStr;
  }
}

function formatDateShort(header: string): string {
  if (!header) return "";
  try {
    const d = new Date(header);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return header;
  }
}

export function EmailDraftCard({ card }: EmailDraftCardProps) {
  if (card.type === "emails_list") {
    return (
      <div className="glass rounded-xl px-4 py-3 text-sm w-[28rem]">
        <div className="flex items-center gap-2 mb-2 text-muted-foreground">
          <Inbox className="size-3.5" />
          <span className="text-xs font-medium uppercase tracking-wide">Emails</span>
        </div>
        <div className="font-medium">{card.count} email{card.count !== 1 ? "s" : ""}</div>
        {card.emails?.slice(0, 5).map((email: any, i: number) => (
          <div key={i}>
            {i > 0 && <div className="border-t border-white/[0.08] my-1.5" />}
            <div className="text-xs">
              <div className="flex items-center gap-1.5">
                <span className={`size-1.5 rounded-full shrink-0 ${email.is_unread ? "bg-cyan-400" : "bg-transparent"}`} />
                <span className={email.is_unread ? "font-medium" : "text-muted-foreground"}>
                  {email.subject || "(no subject)"}
                </span>
                <span className="opacity-50 ml-auto shrink-0">{relativeTime(email.date)}</span>
              </div>
              <div className="opacity-70 pl-3 truncate">
                {email.from?.split("<")[0].trim()}
                {email.snippet && <span className="opacity-50"> — {email.snippet}</span>}
              </div>
            </div>
          </div>
        ))}
        {card.count > 5 && (
          <div className="opacity-50 text-xs mt-1">+{card.count - 5} more</div>
        )}
      </div>
    );
  }

  if (card.type === "email_read") {
    return (
      <div className="glass rounded-xl px-4 py-3 text-sm w-[28rem]">
        <div className="flex items-center gap-2 mb-2 text-muted-foreground">
          <MailOpen className="size-3.5" />
          <span className="text-xs font-medium uppercase tracking-wide">Email</span>
        </div>
        <div className="font-medium">{card.subject}</div>
        <div className="text-muted-foreground text-xs mt-1">
          From {card.from?.split("<")[0].trim()}
        </div>
        {card.to && (
          <div className="opacity-70 text-xs">To {card.to?.split("<")[0].trim()}</div>
        )}
        <div className="opacity-70 text-xs">{formatDateShort(card.date)}</div>
        {card.body_preview && (
          <div className="text-muted-foreground text-xs mt-2 line-clamp-4 whitespace-pre-wrap">{card.body_preview}</div>
        )}
      </div>
    );
  }

  if (card.type === "contacts_list") {
    return (
      <div className="glass rounded-xl px-4 py-3 text-sm w-[28rem]">
        <div className="flex items-center gap-2 mb-2 text-muted-foreground">
          <User className="size-3.5" />
          <span className="text-xs font-medium uppercase tracking-wide">Contacts</span>
        </div>
        <div className="font-medium">{card.count} contact{card.count !== 1 ? "s" : ""}</div>
        {card.contacts?.slice(0, 5).map((contact: any, i: number) => (
          <div key={i} className="text-muted-foreground text-xs mt-1">
            <div className="flex items-center gap-1.5">
              <User className="size-3 shrink-0 opacity-50" />
              <span>{contact.name}</span>
            </div>
            {contact.email && <div className="opacity-70 ml-4.5">{contact.email}</div>}
            {contact.phone && <div className="opacity-70 ml-4.5">{contact.phone}</div>}
          </div>
        ))}
        {card.count > 5 && (
          <div className="opacity-50 text-xs mt-1">+{card.count - 5} more</div>
        )}
      </div>
    );
  }

  const label = card.type === "email_sent" ? "Email Sent" : "Draft Created";

  return (
    <div className="glass rounded-xl px-4 py-3 text-sm w-[28rem]">
      <div className="flex items-center gap-2 mb-2 text-muted-foreground">
        <Mail className="size-3.5" />
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <div className="font-medium">{card.subject}</div>
      <div className="text-muted-foreground text-xs mt-1">
        To {card.to?.split("<")[0].trim() || card.to}
      </div>
      {card.body_preview && (
        <div className="opacity-70 text-xs mt-1 line-clamp-2 italic">"{card.body_preview}"</div>
      )}
    </div>
  );
}
