import { CalendarEventCard } from "./cards/CalendarEventCard";
import { TaskItemCard } from "./cards/TaskItemCard";
import { EmailDraftCard } from "./cards/EmailDraftCard";
import { RouteDistanceCard } from "./cards/RouteDistanceCard";

interface ToolCardProps {
  card: {
    type: string;
    [key: string]: any;
  };
  className?: string;
}

const CALENDAR_TYPES = new Set(["events_list", "event_created", "event_updated", "event_deleted"]);
const TASK_TYPES = new Set(["tasks_list", "task_created", "task_completed", "task_deleted"]);
const EMAIL_TYPES = new Set(["emails_list", "email_read", "email_sent", "email_drafted", "contacts_list"]);
const MAP_TYPES = new Set(["distance_matrix", "route"]);

export function ToolCard({ card, className = "" }: ToolCardProps) {
  let content;

  if (CALENDAR_TYPES.has(card.type)) {
    content = <CalendarEventCard card={card} />;
  } else if (TASK_TYPES.has(card.type)) {
    content = <TaskItemCard card={card} />;
  } else if (EMAIL_TYPES.has(card.type)) {
    content = <EmailDraftCard card={card} />;
  } else if (MAP_TYPES.has(card.type)) {
    content = <RouteDistanceCard card={card} />;
  } else {
    return null;
  }

  return (
    <div className={`flex justify-start mb-2 fade-in ${className}`}>
      {content}
    </div>
  );
}
