import { Calendar, CheckSquare, Mail, MapPin, User, List, Trash2, Route, Inbox, MailOpen } from "lucide-react";

interface ToolCardProps {
  card: {
    type: string;
    [key: string]: any;
  };
}

const ICON_MAP: Record<string, any> = {
  task_created: CheckSquare,
  task_completed: CheckSquare,
  task_deleted: Trash2,
  tasks_list: List,
  event_created: Calendar,
  event_updated: Calendar,
  event_deleted: Trash2,
  events_list: Calendar,
  email_sent: Mail,
  email_drafted: Mail,
  emails_list: Inbox,
  email_read: MailOpen,
  contacts_list: User,
  distance_matrix: MapPin,
  route: Route,
};

const LABEL_MAP: Record<string, string> = {
  task_created: "Task Created",
  task_completed: "Task Completed",
  task_deleted: "Task Deleted",
  tasks_list: "Tasks",
  event_created: "Event Created",
  event_updated: "Event Updated",
  event_deleted: "Event Deleted",
  events_list: "Calendar Events",
  email_sent: "Email Sent",
  email_drafted: "Draft Created",
  emails_list: "Emails",
  email_read: "Email",
  contacts_list: "Contacts",
  distance_matrix: "Distance",
  route: "Directions",
};

const MODE_LABEL: Record<string, string> = {
  driving: "Driving",
  walking: "Walking",
  bicycling: "Biking",
  transit: "Transit",
};

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

function formatDateShort(header: string): string {
  if (!header) return "";
  try {
    const d = new Date(header);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return header;
  }
}

function ExternalLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-400 text-xs mt-2 inline-block hover:underline"
    >
      {children}
    </a>
  );
}

export function ToolCard({ card }: ToolCardProps) {
  const Icon = ICON_MAP[card.type] || MapPin;
  const label = LABEL_MAP[card.type] || card.type;

  return (
    <div className="flex justify-start mb-3">
      <div className="w-80 rounded-2xl px-4 py-3 text-sm bg-zinc-900 border border-zinc-800">
        <div className="flex items-center gap-2 mb-2 text-zinc-400">
          <Icon className="size-3.5" />
          <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
        </div>

        {card.type === "task_created" && (
          <div>
            <div className="text-zinc-100 font-medium">{card.title}</div>
            {card.notes && (
              <div className="text-zinc-500 text-xs mt-1 line-clamp-2">{card.notes}</div>
            )}
            {card.due && (
              <div className="text-zinc-500 text-xs mt-1">
                Due {new Date(card.due).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
              </div>
            )}
            <ExternalLink href={card.webViewLink}>Open in Google Tasks</ExternalLink>
          </div>
        )}

        {card.type === "task_completed" && (
          <div>
            <div className="text-zinc-100 font-medium line-through">{card.title}</div>
          </div>
        )}

        {card.type === "task_deleted" && (
          <div className="text-zinc-500 text-xs">Task deleted</div>
        )}

        {card.type === "tasks_list" && (
          <div>
            <div className="text-zinc-100 font-medium">
              {card.pending_count ?? card.count} pending
              {card.completed_count > 0 && (
                <span className="text-zinc-500 font-normal"> · {card.completed_count} done</span>
              )}
            </div>
            {card.tasks?.slice(0, 5).map((task: any, i: number) => (
              <div key={i} className="flex items-center gap-1.5 text-zinc-400 text-xs mt-1">
                <CheckSquare className={`size-3 shrink-0 ${task.status === "completed" ? "text-zinc-600" : "text-zinc-500"}`} />
                <span className={task.status === "completed" ? "line-through text-zinc-600" : ""}>
                  {task.title}
                </span>
                {task.notes && task.status !== "completed" && (
                  <span className="text-zinc-700 truncate">· {task.notes}</span>
                )}
                {task.due && task.status !== "completed" && (
                  <span className="text-zinc-700 ml-auto shrink-0">
                    {new Date(task.due).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </span>
                )}
              </div>
            ))}
            {card.count > 5 && (
              <div className="text-zinc-700 text-xs mt-1">+{card.count - 5} more</div>
            )}
          </div>
        )}

        {card.type === "event_created" && (
          <div>
            <div className="text-zinc-100 font-medium">{card.summary}</div>
            <div className="text-zinc-500 text-xs mt-1">
              {formatEventTime(card.start)}
              {calcDuration(card.start, card.end) && (
                <span className="text-zinc-600"> · {calcDuration(card.start, card.end)}</span>
              )}
            </div>
            <ExternalLink href={card.htmlLink}>Open in Google Calendar</ExternalLink>
          </div>
        )}

        {card.type === "event_updated" && (
          <div>
            <div className="text-zinc-100 font-medium">{card.summary}</div>
            <div className="text-zinc-500 text-xs mt-1">
              {formatEventTime(card.start)}
              {calcDuration(card.start, card.end) && (
                <span className="text-zinc-600"> · {calcDuration(card.start, card.end)}</span>
              )}
            </div>
            <ExternalLink href={card.htmlLink}>Open in Google Calendar</ExternalLink>
          </div>
        )}

        {card.type === "event_deleted" && (
          <div className="text-zinc-500 text-xs">Event deleted</div>
        )}

        {card.type === "events_list" && (
          <div>
            <div className="text-zinc-100 font-medium">{card.count} event{card.count !== 1 ? "s" : ""}</div>
            {card.events?.slice(0, 5).map((event: any, i: number) => (
              <div key={i} className="text-zinc-400 text-xs mt-1 flex items-center gap-1.5">
                <Calendar className="size-3 shrink-0" />
                <span>{event.summary}</span>
                <span className="text-zinc-600 ml-auto shrink-0">
                  {formatEventTime(event.start || event.date_range)}
                </span>
              </div>
            ))}
            {card.count > 5 && (
              <div className="text-zinc-700 text-xs mt-1">+{card.count - 5} more</div>
            )}
          </div>
        )}

        {card.type === "email_sent" && (
          <div>
            <div className="text-zinc-100 font-medium">{card.subject}</div>
            <div className="text-zinc-500 text-xs mt-1">To {card.to?.split("<")[0].trim() || card.to}</div>
          </div>
        )}

        {card.type === "email_drafted" && (
          <div>
            <div className="text-zinc-100 font-medium">{card.subject}</div>
            <div className="text-zinc-500 text-xs mt-1">To {card.to?.split("<")[0].trim() || card.to}</div>
            {card.body_preview && (
              <div className="text-zinc-600 text-xs mt-1 line-clamp-2 italic">"{card.body_preview}"</div>
            )}
          </div>
        )}

        {card.type === "emails_list" && (
          <div>
            <div className="text-zinc-100 font-medium">{card.count} email{card.count !== 1 ? "s" : ""}</div>
            {card.emails?.slice(0, 5).map((email: any, i: number) => (
              <div key={i}>
                {i > 0 && <div className="border-t border-zinc-800 my-1.5" />}
                <div className="text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className={`size-1.5 rounded-full shrink-0 ${email.is_unread ? "bg-blue-400" : "bg-transparent"}`} />
                    <span className={email.is_unread ? "text-zinc-100 font-medium" : "text-zinc-400"}>
                      {email.subject || "(no subject)"}
                    </span>
                    <span className="text-zinc-700 ml-auto shrink-0">{relativeTime(email.date)}</span>
                  </div>
                  <div className="text-zinc-600 pl-3 truncate">
                    {email.from?.split("<")[0].trim()}
                    {email.snippet && <span className="text-zinc-700"> — {email.snippet}</span>}
                  </div>
                </div>
              </div>
            ))}
            {card.count > 5 && (
              <div className="text-zinc-700 text-xs mt-1">+{card.count - 5} more</div>
            )}
          </div>
        )}

        {card.type === "email_read" && (
          <div>
            <div className="text-zinc-100 font-medium">{card.subject}</div>
            <div className="text-zinc-500 text-xs mt-1">
              From {card.from?.split("<")[0].trim()}
            </div>
            {card.to && (
              <div className="text-zinc-600 text-xs">
                To {card.to?.split("<")[0].trim()}
              </div>
            )}
            <div className="text-zinc-600 text-xs">{formatDateShort(card.date)}</div>
            {card.body_preview && (
              <div className="text-zinc-500 text-xs mt-2 line-clamp-4 whitespace-pre-wrap">{card.body_preview}</div>
            )}
          </div>
        )}

        {card.type === "contacts_list" && (
          <div>
            <div className="text-zinc-100 font-medium">{card.count} contact{card.count !== 1 ? "s" : ""}</div>
            {card.contacts?.slice(0, 5).map((contact: any, i: number) => (
              <div key={i} className="text-zinc-400 text-xs mt-1">
                <div className="flex items-center gap-1.5">
                  <User className="size-3 shrink-0" />
                  <span>{contact.name}</span>
                </div>
                {contact.email && <div className="text-zinc-600 ml-4.5">{contact.email}</div>}
                {contact.phone && <div className="text-zinc-600 ml-4.5">{contact.phone}</div>}
              </div>
            ))}
            {card.count > 5 && (
              <div className="text-zinc-700 text-xs mt-1">+{card.count - 5} more</div>
            )}
          </div>
        )}

        {card.type === "distance_matrix" && (
          <div>
            {card.results?.map((result: any, i: number) => (
              <div key={i} className="text-zinc-400 text-xs mt-1">
                <div className="text-zinc-100 font-medium">{result.distance} · {result.duration}</div>
                <div className="text-zinc-500">{result.origin} → {result.destination}</div>
              </div>
            ))}
            {card.mode && (
              <div className="text-zinc-700 text-xs mt-1.5">{MODE_LABEL[card.mode] || card.mode}</div>
            )}
          </div>
        )}

        {card.type === "route" && (
          <div>
            {card.routes?.slice(0, 2).map((route: any, i: number) => (
              <div key={i} className={i > 0 ? "mt-2 pt-2 border-t border-zinc-800" : ""}>
                <div className="text-zinc-100 font-medium">{route.distance} · {route.duration}</div>
                <div className="text-zinc-500 text-xs">{route.start_address} → {route.end_address}</div>
                {route.summary && <div className="text-zinc-600 text-xs">via {route.summary}</div>}
              </div>
            ))}
            <div className="flex items-center gap-2 text-zinc-700 text-xs mt-1.5">
              {card.mode && <span>{MODE_LABEL[card.mode] || card.mode}</span>}
              {card.step_count > 0 && <span>{card.step_count} steps</span>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
