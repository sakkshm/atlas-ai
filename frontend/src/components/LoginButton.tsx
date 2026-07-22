import { Button } from "@/components/ui/button";
import { login } from "@/lib/api";

interface LoginButtonProps {
  variant?: "default" | "cta";
}

export function LoginButton({ variant = "default" }: LoginButtonProps) {
  return (
    <Button onClick={login} size="lg" className={variant === "cta" ? "rounded-full bg-white text-black hover:bg-white/90 px-6" : "gap-2"}>
      Sign in with Google
    </Button>
  );
}
