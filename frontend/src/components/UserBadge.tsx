import { Button } from "@/components/ui/button";

interface UserBadgeProps {
  name: string;
  email: string;
  avatar_url: string | null;
  onLogout: () => void;
}

export function UserBadge({ name, email, avatar_url, onLogout }: UserBadgeProps) {
  return (
    <div className="flex items-center gap-3">
      {avatar_url ? (
        <img src={avatar_url} alt={name} className="w-8 h-8 rounded-full" />
      ) : (
        <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-sm font-medium">
          {name[0]}
        </div>
      )}
      <div className="text-sm">
        <div className="font-medium">{name}</div>
        <div className="text-zinc-400 text-xs">{email}</div>
      </div>
      <Button variant="ghost" size="sm" onClick={onLogout}>
        Sign out
      </Button>
    </div>
  );
}
