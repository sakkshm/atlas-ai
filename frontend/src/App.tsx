import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { Layout } from "@/components/layout/Layout";
import { ChatPage } from "@/pages/ChatPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { LandingPage } from "@/pages/LandingPage";
import { LoginButton } from "@/components/LoginButton";

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
          <h1 className="text-2xl font-medium tracking-tight">Atlas AI</h1>
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
