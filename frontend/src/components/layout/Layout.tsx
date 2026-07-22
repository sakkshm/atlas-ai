import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import type { User } from "@/hooks/useAuth";

interface LayoutProps {
  user: User;
  token: string;
  onLogout: () => void;
  children: React.ReactNode;
}

export function Layout({ user, token, onLogout, children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-background text-foreground">
      <Sidebar
        token={token}
        user={user}
        onLogout={onLogout}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <Header onToggleSidebar={() => setSidebarOpen((o) => !o)} />
        <div className="flex-1 flex flex-col min-h-0">{children}</div>
      </div>
    </div>
  );
}
