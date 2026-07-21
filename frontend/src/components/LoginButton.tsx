import { Button } from "@/components/ui/button";
import { login } from "@/lib/api";

export function LoginButton() {
  return (
    <Button onClick={login} size="lg" className="gap-2">
      Sign in with Google
    </Button>
  );
}
