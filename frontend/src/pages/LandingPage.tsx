import { Link } from "react-router-dom";
import { Mic, Calendar, Mail, CheckSquare, ArrowRight, MapPin } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { LoginButton } from "@/components/LoginButton";

const FEATURES = [
  {
    icon: Mic,
    title: "Voice-first",
    description: "Speak naturally to manage your schedule, email, and tasks.",
    color: "text-cyan-400",
  },
  {
    icon: Calendar,
    title: "Calendar",
    description: "Create, update, and query events across all your calendars.",
    color: "text-blue-400",
  },
  {
    icon: Mail,
    title: "Gmail",
    description: "Read, search, and draft emails without leaving the conversation.",
    color: "text-emerald-400",
  },
  {
    icon: CheckSquare,
    title: "Tasks",
    description: "Create and complete Google Tasks on the fly.",
    color: "text-amber-400",
  },
  {
    icon: MapPin,
    title: "Maps",
    description: "Get distances, directions, and travel time between places.",
    color: "text-orange-400",
  },
  {
    icon: ArrowRight,
    title: "Multilingual",
    description: "Speak in English, Hindi, or 10 other Indian languages.",
    color: "text-violet-400",
  },
];

export function LandingPage() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="relative min-h-screen flex flex-col overflow-y-auto scrollbar-hidden" style={{ background: "#08080C" }}>
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -left-32 top-1/3 w-[400px] h-[400px] rounded-full blur-[100px] opacity-25" style={{ background: "radial-gradient(circle, #00F2FE 0%, transparent 70%)" }} />
        <div className="absolute left-1/2 -top-24 -translate-x-1/2 w-[350px] h-[300px] rounded-full blur-[100px] opacity-15" style={{ background: "radial-gradient(circle, #2563EB 0%, transparent 70%)" }} />
        <div className="absolute -right-32 bottom-8 w-[320px] h-[280px] rounded-full blur-[90px] opacity-15" style={{ background: "radial-gradient(circle, #FF7A00 0%, transparent 70%)" }} />
      </div>

      <header className="relative z-10 fixed top-0 inset-x-0 flex justify-center pt-5 px-4">
        <nav className="flex items-center gap-6 rounded-full glass-strong px-5 py-2 text-sm">
          <span className="font-heading text-lg tracking-[-0.02em]">Atlas</span>
          <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">Features</a>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            GitHub
          </a>
          {isAuthenticated ? (
            <Link
              to="/app"
              className="inline-flex items-center justify-center rounded-full bg-white text-black px-4 py-1.5 text-sm font-medium hover:bg-white/90 transition-opacity"
            >
              Open App
            </Link>
          ) : (
            <LoginButton variant="cta" />
          )}
        </nav>
      </header>

      <main className="relative z-10 flex-1 flex flex-col">
        <section className="relative flex-1 flex items-center justify-center px-4 pt-28 pb-20">
          <div className="max-w-2xl mx-auto text-center space-y-6">
            <h1 className="font-heading text-5xl sm:text-6xl font-normal tracking-[-0.01em] leading-[1.1]">
              Your AI assistant<br />for Google workspace
            </h1>
            <p className="text-muted-foreground text-lg max-w-md mx-auto leading-relaxed">
              Manage calendar, email, tasks, and maps — with your voice.
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              {isAuthenticated ? (
                <Link
                  to="/app"
                  className="inline-flex items-center justify-center rounded-full bg-white text-black px-6 py-2.5 text-sm font-medium hover:bg-white/90 transition-opacity"
                >
                  Open App
                </Link>
              ) : (
                <LoginButton variant="cta" />
              )}
              <a
                href="#features"
                className="inline-flex items-center justify-center rounded-full glass px-6 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-white/[0.06] transition-colors"
              >
                Learn more
              </a>
            </div>
          </div>
        </section>

        <section id="features" className="px-4 pb-24">
          <div className="max-w-3xl mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-white/[0.06] rounded-2xl overflow-hidden">
              {FEATURES.map((f) => (
                <div
                  key={f.title}
                  className="glass p-6 space-y-3"
                >
                  <f.icon className={`size-5 ${f.color}`} strokeWidth={1.5} />
                  <h3 className="text-sm font-medium">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {f.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-white/[0.08] px-4 py-6 text-center text-xs text-muted-foreground">
        Atlas AI
      </footer>
    </div>
  );
}
