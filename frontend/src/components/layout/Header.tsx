import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  onToggleSidebar: () => void;
}

export function Header({ onToggleSidebar }: HeaderProps) {
  return (
    <header className="flex items-center px-4 py-3 border-b border-border lg:hidden">
      <Button variant="ghost" size="icon-sm" onClick={onToggleSidebar}>
        <Menu className="size-4" />
      </Button>
      <h1 className="text-sm font-semibold ml-2">Atlas AI</h1>
    </header>
  );
}
