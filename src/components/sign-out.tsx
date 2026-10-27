"use client";
import { useState, useSyncExternalStore } from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "./ui/button";
import { toast } from "sonner";
export function SignOut() {
  const ready = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const [busy, setBusy] = useState(false);
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={!ready || busy}
      onClick={async () => {
        setBusy(true);
        try {
          const result = await authClient.signOut();
          if (result.error) throw Error();
          window.location.replace("/login");
        } catch {
          toast.error("Could not sign out. Please try again.");
          setBusy(false);
        }
      }}
    >
      Sign out
    </Button>
  );
}
const subscribe = () => () => {};
