import { Calendar, CheckSquare, Mail, MapPin, User, List, Trash2, Route } from "lucide-react";

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
  contacts_list: "Contacts",
  distance_matrix: "Distance",
  route: "Directions",
};

export function ToolCard({ card }: ToolCardProps) {
  const Icon = ICON_MAP[card.type] || MapPin;
  const label = LABEL_MAP[card.type] || card.type;

  return (
    <div className="flex justify-start mb-3">
      <div className="max-w-[45%] rounded-2xl px-4 py-3 text-sm bg-zinc-900 border border-zinc-800">
        <div className="flex items-center gap-2 mb-2 text-zinc-400">
          <Icon className="size-3.5" />
          <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
        </div>

        {card.type === "task_created" && (
          <div>
            <div className="text-zinc-100 font-medium">{card.title}</div>
            {card.due && (
              <div className="text-zinc-500 text-xs mt-1">Due: {card.due}</div>
            )}
            {card.webViewLink && (
              <a
                href={card.webViewLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 text-xs mt-2 inline-block hover:underline"
              >
                Open in Google Tasks
              </a>
            )}
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
            <div className="text-zinc-100 font-medium">{card.count} task{card.count !== 1 ? "s" : ""}</div>
            {card.tasks?.slice(0, 5).map((task: any, i: number) => (
              <div key={i} className="text-zinc-400 text-xs mt-1 flex items-center gap-1.5">
                <CheckSquare className="size-3" />
                <span>{task.title}</span>
                {task.due && <span className="text-zinc-600">· {new Date(task.due).toLocaleDateString()}</span>}
              </div>
            ))}
          </div>
        )}

        {card.type === "event_created" && (
          <div>
            <div className="text-zinc-100 font-medium">{card.summary}</div>
            <div className="text-zinc-500 text-xs mt-1">
              {card.start} - {card.end}
            </div>
            {card.htmlLink && (
              <a
                href={card.htmlLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 text-xs mt-2 inline-block hover:underline"
              >
                Open in Google Calendar
              </a>
            )}
          </div>
        )}

        {card.type === "event_updated" && (
          <div>
            <div className="text-zinc-100 font-medium">{card.summary}</div>
            <div className="text-zinc-500 text-xs mt-1">
              {card.start} - {card.end}
            </div>
            {card.htmlLink && (
              <a
                href={card.htmlLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 text-xs mt-2 inline-block hover:underline"
              >
                Open in Google Calendar
              </a>
            )}
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
                <Calendar className="size-3" />
                <span>{event.summary}</span>
                <span className="text-zinc-600">· {event.date_range || ""}</span>
              </div>
            ))}
          </div>
        )}

        {card.type === "email_sent" && (
          <div>
            <div className="text-zinc-100 font-medium">{card.subject}</div>
            <div className="text-zinc-500 text-xs mt-1">To: {card.to}</div>
          </div>
        )}

        {card.type === "email_drafted" && (
          <div>
            <div className="text-zinc-100 font-medium">{card.subject}</div>
            <div className="text-zinc-500 text-xs mt-1">To: {card.to}</div>
            {card.body_preview && (
              <div className="text-zinc-600 text-xs mt-1 line-clamp-2">{card.body_preview}</div>
            )}
          </div>
        )}

        {card.type === "contacts_list" && (
          <div>
            <div className="text-zinc-100 font-medium">{card.count} contact{card.count !== 1 ? "s" : ""}</div>
            {card.contacts?.slice(0, 5).map((contact: any, i: number) => (
              <div key={i} className="text-zinc-400 text-xs mt-1">
                <div className="flex items-center gap-1.5">
                  <User className="size-3" />
                  <span>{contact.name}</span>
                </div>
                {contact.email && <div className="text-zinc-600 ml-4.5">{contact.email}</div>}
                {contact.phone && <div className="text-zinc-600 ml-4.5">{contact.phone}</div>}
              </div>
            ))}
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
          </div>
        )}

        {card.type === "route" && (
          <div>
            {card.routes?.slice(0, 2).map((route: any, i: number) => (
              <div key={i} className="mt-1">
                <div className="text-zinc-100 font-medium">{route.distance} · {route.duration}</div>
                <div className="text-zinc-500 text-xs">{route.start_address} → {route.end_address}</div>
                {route.summary && <div className="text-zinc-600 text-xs">{route.summary}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
