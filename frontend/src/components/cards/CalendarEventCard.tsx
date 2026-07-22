import { Calendar, Trash2 } from "lucide-react";

interface CalendarEventCardProps {
  card: {
    type: string;
    [key: string]: any;
  };
}

function formatEventTime(iso: string): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
    if (d.toDateString() === today.toDateString()) return `Today · ${time}`;
    if (d.toDateString() === tomorrow.toDateString()) return `Tomorrow · ${time}`;
    const date = d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
    return `${date} · ${time}`;
  } catch {
    return iso;
  }
}

function calcDuration(start: string, end: string): string {
  if (!start || !end) return "";
  try {
    const ms = new Date(end).getTime() - new Date(start).getTime();
    if (ms < 0) return "";
    const mins = Math.floor(ms / 60_000);
    if (mins < 60) return `${mins}m`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m ? `${h}h ${m}m` : `${h}h`;
  } catch {
    return "";
  }
}

function ExternalLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-cyan-400 text-xs mt-2 inline-block hover:underline">
      {children}
    </a>
  );
}

export function CalendarEventCard({ card }: CalendarEventCardProps) {
  if (card.type === "events_list") {
    return (
      <div className="glass rounded-xl px-4 py-3 text-sm w-[28rem]">
        <div className="flex items-center gap-2 mb-2 text-muted-foreground">
          <Calendar className="size-3.5" />
          <span className="text-xs font-medium uppercase tracking-wide">Calendar Events</span>
        </div>
        <div className="font-medium">{card.count} event{card.count !== 1 ? "s" : ""}</div>
        {card.events?.slice(0, 5).map((event: any, i: number) => (
          <div key={i} className="text-muted-foreground text-xs mt-1 flex items-center gap-1.5">
            <Calendar className="size-3 shrink-0 opacity-50" />
            <span>{event.summary}</span>
            <span className="opacity-70 ml-auto shrink-0">
              {formatEventTime(event.start || event.date_range)}
            </span>
          </div>
        ))}
        {card.count > 5 && (
          <div className="opacity-50 text-xs mt-1">+{card.count - 5} more</div>
        )}
      </div>
    );
  }

  if (card.type === "event_deleted") {
    return (
      <div className="glass rounded-xl px-4 py-3 text-sm w-[28rem]">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Trash2 className="size-3.5" />
          <span className="text-xs font-medium uppercase tracking-wide">Event Deleted</span>
        </div>
      </div>
    );
  }

  const label = card.type === "event_created" ? "Event Created" : "Event Updated";

  return (
    <div className="glass rounded-xl px-4 py-3 text-sm w-[28rem]">
      <div className="flex items-center gap-2 mb-2 text-muted-foreground">
        <Calendar className="size-3.5" />
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <div className="font-medium">{card.summary}</div>
      <div className="text-muted-foreground text-xs mt-1">
        {formatEventTime(card.start)}
        {calcDuration(card.start, card.end) && (
          <span className="opacity-70"> · {calcDuration(card.start, card.end)}</span>
        )}
      </div>
      <ExternalLink href={card.htmlLink}>Open in Google Calendar</ExternalLink>
    </div>
  );
}
