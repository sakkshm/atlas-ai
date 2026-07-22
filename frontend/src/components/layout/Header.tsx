import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  onToggleSidebar: () => void;
}

export function Header({ onToggleSidebar }: HeaderProps) {
  return (
    <header className="flex items-center px-4 py-3 border-b border-white/[0.08] shrink-0 lg:hidden">
      <Button variant="ghost" size="icon-sm" onClick={onToggleSidebar}>
        <Menu className="size-4" />
      </Button>
      <h1 className="text-sm font-semibold ml-2 tracking-tight">Atlas AI</h1>
    </header>
  );
}
