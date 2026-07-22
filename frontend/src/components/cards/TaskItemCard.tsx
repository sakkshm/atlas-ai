import { CheckSquare, List, Trash2 } from "lucide-react";

interface TaskItemCardProps {
  card: {
    type: string;
    [key: string]: any;
  };
}

export function TaskItemCard({ card }: TaskItemCardProps) {
  if (card.type === "tasks_list") {
    return (
      <div className="glass rounded-xl px-4 py-3 text-sm w-[28rem]">
        <div className="flex items-center gap-2 mb-2 text-muted-foreground">
          <List className="size-3.5" />
          <span className="text-xs font-medium uppercase tracking-wide">Tasks</span>
        </div>
        <div className="font-medium">
          {card.pending_count ?? card.count} pending
          {card.completed_count > 0 && (
            <span className="text-muted-foreground font-normal"> · {card.completed_count} done</span>
          )}
        </div>
        {card.tasks?.slice(0, 5).map((task: any, i: number) => (
          <div key={i} className="flex items-center gap-1.5 text-muted-foreground text-xs mt-1">
            <CheckSquare className={`size-3 shrink-0 ${task.status === "completed" ? "opacity-30" : "opacity-50"}`} />
            <span className={task.status === "completed" ? "line-through opacity-50" : ""}>
              {task.title}
            </span>
            {task.notes && task.status !== "completed" && (
              <span className="opacity-50 truncate">· {task.notes}</span>
            )}
            {task.due && task.status !== "completed" && (
              <span className="opacity-50 ml-auto shrink-0">
                {new Date(task.due).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
              </span>
            )}
          </div>
        ))}
        {card.count > 5 && (
          <div className="opacity-50 text-xs mt-1">+{card.count - 5} more</div>
        )}
      </div>
    );
  }

  if (card.type === "task_deleted") {
    return (
      <div className="glass rounded-xl px-4 py-3 text-sm w-[28rem]">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Trash2 className="size-3.5" />
          <span className="text-xs font-medium uppercase tracking-wide">Task Deleted</span>
        </div>
      </div>
    );
  }

  if (card.type === "task_completed") {
    return (
      <div className="glass rounded-xl px-4 py-3 text-sm w-[28rem]">
        <div className="flex items-center gap-2 mb-2 text-muted-foreground">
          <CheckSquare className="size-3.5" />
          <span className="text-xs font-medium uppercase tracking-wide">Task Completed</span>
        </div>
        <div className="font-medium line-through">{card.title}</div>
      </div>
    );
  }

  return (
    <div className="glass rounded-xl px-4 py-3 text-sm w-[28rem]">
      <div className="flex items-center gap-2 mb-2 text-muted-foreground">
        <CheckSquare className="size-3.5" />
        <span className="text-xs font-medium uppercase tracking-wide">Task Created</span>
      </div>
      <div className="font-medium">{card.title}</div>
      {card.notes && (
        <div className="text-muted-foreground text-xs mt-1 line-clamp-2">{card.notes}</div>
      )}
      {card.due && (
        <div className="text-muted-foreground text-xs mt-1">
          Due {new Date(card.due).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
        </div>
      )}
      <a href={card.webViewLink} target="_blank" rel="noopener noreferrer" className="text-cyan-400 text-xs mt-2 inline-block hover:underline">
        Open in Google Tasks
      </a>
    </div>
  );
}
