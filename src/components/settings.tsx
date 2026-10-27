"use client";
import { useTheme } from "next-themes";
import { Sun, Moon, Monitor } from "lucide-react";
import { Button } from "./ui/button";
import { useSyncExternalStore } from "react";
const subscribe = () => () => {};
export function ThemeSettings() {
  const { theme, setTheme } = useTheme(),
    mounted = useSyncExternalStore(
      subscribe,
      () => true,
      () => false,
    );
  return (
    <div className="theme-options">
      {[
        ["light", "Light", Sun],
        ["dark", "Dark", Moon],
        ["system", "System", Monitor],
      ].map(([value, label, Icon]) => (
        <Button
          variant={mounted && theme === value ? "default" : "outline"}
          key={String(value)}
          onClick={() => setTheme(String(value))}
        >
          <Icon size={17} />
          {String(label)}
        </Button>
      ))}
    </div>
  );
}
