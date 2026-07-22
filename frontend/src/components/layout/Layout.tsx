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
    <div className="relative h-full w-full overflow-hidden" style={{ background: "#050508" }}>
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -left-32 top-1/4 w-[400px] h-[400px] rounded-full blur-[100px] opacity-30" style={{ background: "radial-gradient(circle, #00F2FE 0%, transparent 70%)" }} />
        <div className="absolute left-1/2 -top-20 -translate-x-1/2 w-[350px] h-[300px] rounded-full blur-[100px] opacity-20" style={{ background: "radial-gradient(circle, #2563EB 0%, transparent 70%)" }} />
        <div className="absolute -right-32 bottom-0 w-[320px] h-[280px] rounded-full blur-[90px] opacity-15" style={{ background: "radial-gradient(circle, #FF7A00 0%, transparent 70%)" }} />
      </div>

      <div className="relative z-10 flex h-full p-2">
        <div className="flex w-full h-full rounded-2xl overflow-hidden glass-strong">
          <Sidebar
            token={token}
            user={user}
            onLogout={onLogout}
            open={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
          />

          <div className="flex-1 flex flex-col min-w-0 h-full">
            <Header onToggleSidebar={() => setSidebarOpen((o) => !o)} />
            <div className="flex-1 flex flex-col min-h-0 relative">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
