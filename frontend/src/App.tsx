import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { Layout } from "@/components/layout/Layout";
import { ChatPage } from "@/pages/ChatPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { LandingPage } from "@/pages/LandingPage";
import { LoginButton } from "@/components/LoginButton";

function isFirefox(): boolean {
  return typeof navigator !== "undefined" && navigator.userAgent.toLowerCase().includes("firefox");
}

function AppRoutes() {
  const { user, loading, logout, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-muted-foreground text-sm">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-medium tracking-tight">Atlas</h1>
          <p className="text-muted-foreground text-sm">Please sign in to continue</p>
          <LoginButton />
        </div>
      </div>
    );
  }

  const token = localStorage.getItem("token")!;

  return (
    <Layout user={user} token={token} onLogout={logout}>
      <Routes>
        <Route path="/" element={<ChatPage token={token} />} />
        <Route path="/c/:sessionId" element={<ChatPage token={token} />} />
        <Route
          path="/settings"
          element={<SettingsPage token={token} user={user} onLogout={logout} />}
        />
      </Routes>
    </Layout>
  );
}

function App() {
  if (isFirefox()) {
    return (
      <div className="relative min-h-screen flex items-center justify-center overflow-hidden" style={{ background: "#08080C" }}>
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full blur-[120px] opacity-20" style={{ background: "radial-gradient(circle, #00F2FE 0%, transparent 70%)" }} />
        </div>
        <div className="relative z-10 text-center space-y-6 max-w-sm px-6">
          <h1 className="font-heading text-3xl tracking-[-0.01em]">Atlas</h1>
          <div className="glass rounded-2xl p-8 border border-white/[0.06] space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              This site runs best on <strong className="text-foreground">Google Chrome</strong>.
            </p>
            <a
              href="https://www.google.com/chrome/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-full bg-white text-black px-6 py-2.5 text-sm font-medium hover:bg-white/90 transition-opacity"
            >
              Get Chrome
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Toaster position="bottom-right" richColors closeButton theme="dark" />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/app/*" element={<AppRoutes />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
