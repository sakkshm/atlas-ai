import { useAuth } from "@/hooks/useAuth";
import { LoginButton } from "@/components/LoginButton";
import { UserBadge } from "@/components/UserBadge";

function App() {
  const { user, loading, logout, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <div className="text-zinc-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {isAuthenticated && user && (
        <header className="flex justify-end p-4">
          <UserBadge
            name={user.name}
            email={user.email}
            avatar_url={user.avatar_url}
            onLogout={logout}
          />
        </header>
      )}

      <main className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        {isAuthenticated ? (
          <div className="text-center">
            <h1 className="text-2xl font-medium mb-2">Atlas AI</h1>
            <p className="text-zinc-400">Ready</p>
          </div>
        ) : (
          <div className="text-center">
            <h1 className="text-2xl font-medium mb-4">Atlas AI</h1>
            <LoginButton />
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
