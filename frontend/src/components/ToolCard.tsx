import { Calendar, CheckSquare, Mail, MapPin, User } from "lucide-react";

interface ToolCardProps {
  card: {
    type: string;
    [key: string]: any;
  };
}

const ICON_MAP: Record<string, any> = {
  task_created: CheckSquare,
  task_completed: CheckSquare,
  event_created: Calendar,
  event_deleted: Calendar,
  email_sent: Mail,
  email_drafted: Mail,
  contact_found: User,
  distance_result: MapPin,
  directions_result: MapPin,
};

const LABEL_MAP: Record<string, string> = {
  task_created: "Task Created",
  task_completed: "Task Completed",
  event_created: "Event Created",
  event_deleted: "Event Deleted",
  email_sent: "Email Sent",
  email_drafted: "Draft Created",
  contact_found: "Contact Found",
  distance_result: "Distance",
  directions_result: "Directions",
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
          </div>
        )}

        {card.type === "contact_found" && (
          <div>
            <div className="text-zinc-100 font-medium">{card.name}</div>
            {card.email && (
              <div className="text-zinc-500 text-xs mt-1">{card.email}</div>
            )}
            {card.phone && (
              <div className="text-zinc-500 text-xs">{card.phone}</div>
            )}
          </div>
        )}

        {(card.type === "distance_result" || card.type === "directions_result") && (
          <div>
            <div className="text-zinc-100 font-medium">{card.distance}</div>
            <div className="text-zinc-500 text-xs mt-1">{card.duration}</div>
          </div>
        )}
      </div>
    </div>
  );
}
