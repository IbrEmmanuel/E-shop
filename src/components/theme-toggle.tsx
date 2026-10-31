"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";

/**
 * Icons follow `html[data-theme]` via CSS so SSR + FOUC script stay in sync.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={cn("button button--glass button--icon", className)}
      // Stable label avoids SSR/client theme mismatch before hydration.
      aria-label="Toggle color theme"
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      suppressHydrationWarning
    >
      <Sun size={18} className="theme-icon-sun" aria-hidden />
      <Moon size={18} className="theme-icon-moon" aria-hidden />
    </button>
  );
}
