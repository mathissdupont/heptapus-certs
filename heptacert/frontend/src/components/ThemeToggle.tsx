"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

import { useT } from "@/lib/i18n";
import {
  applyTheme,
  getStoredTheme,
  initializeTheme,
  setStoredTheme,
  watchSystemTheme,
  type Theme,
} from "@/lib/theme";

type ThemeToggleProps = {
  labels?: {
    switcher: string;
    light: string;
    dark: string;
    system: string;
  };
  className?: string;
};

export function ThemeToggle(props: ThemeToggleProps = {}) {
  return <ThemeToggleControl {...props} />;
}

const THEMES: Theme[] = ["system", "light", "dark"];

function ThemeToggleControl({ labels, className }: ThemeToggleProps) {
  const t = useT();
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    setTheme(initializeTheme());
    return watchSystemTheme(() => {
      if ((getStoredTheme() ?? "system") === "system") applyTheme("system");
    });
  }, []);

  const nextTheme = THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length];
  const themeLabel = theme === "light"
    ? labels?.light ?? t("theme_light")
    : theme === "dark"
      ? labels?.dark ?? t("theme_dark")
      : labels?.system ?? t("theme_system");
  const label = `${labels?.switcher ?? t("theme_switcher_label")}: ${themeLabel}`;

  const changeTheme = () => {
    setStoredTheme(nextTheme);
    applyTheme(nextTheme);
    setTheme(nextTheme);
  };

  return (
    <button
      type="button"
      onClick={changeTheme}
      className={className ?? "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-surface-200 bg-raised text-surface-600 shadow-soft transition-colors hover:bg-surface-50 hover:text-surface-900"}
      aria-label={label}
      title={label}
    >
      {theme === "light" ? <Sun className="h-4 w-4" /> : theme === "dark" ? <Moon className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}
    </button>
  );
}
