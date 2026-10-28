import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { KEYS, readString, writeString } from "../lib/storage";

export type ThemePref = "midnight" | "silver" | "system";
type Resolved = "midnight" | "silver";

interface ThemeValue {
  pref: ThemePref;
  resolved: Resolved;
  setPref: (pref: ThemePref) => void;
}

const ThemeContext = createContext<ThemeValue | null>(null);
const THEME_COLOR: Record<Resolved, string> = { midnight: "#07090F", silver: "#F4F5F7" };

function systemTheme(): Resolved {
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "silver" : "midnight";
}

function readPref(): ThemePref {
  const saved = readString(KEYS.theme);
  return saved === "silver" || saved === "system" ? saved : "midnight";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [pref, setPrefState] = useState<ThemePref>(readPref);
  const [system, setSystem] = useState<Resolved>(systemTheme);

  useEffect(() => {
    const mql = window.matchMedia("(prefers-color-scheme: light)");
    const onChange = () => setSystem(mql.matches ? "silver" : "midnight");
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  const resolved: Resolved = pref === "system" ? system : pref;

  useEffect(() => {
    document.documentElement.dataset.theme = resolved;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_COLOR[resolved]);
  }, [resolved]);

  const setPref = useCallback((next: ThemePref) => {
    writeString(KEYS.theme, next);
    setPrefState(next);
  }, []);

  const value = useMemo(() => ({ pref, resolved, setPref }), [pref, resolved, setPref]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}
