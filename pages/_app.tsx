import type { AppProps } from "next/app";
import "@/styles/globals.css";
import { IBM_Plex_Sans } from "next/font/google";
import { useEffect, useState } from "react";

const plex = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-plex",
  display: "swap"
});

type Theme = "light" | "dark";

export default function MyApp({ Component, pageProps }: AppProps) {
  const [theme, setTheme] = useState<Theme | null>(null);

  // Initialize theme from localStorage or system preference
  useEffect(() => {
    const saved = (typeof window !== "undefined" && localStorage.getItem("theme")) as Theme | null;
    if (saved === "light" || saved === "dark") {
      setTheme(saved);
      document.documentElement.setAttribute("data-theme", saved);
    } else {
      // follow system preference on first load
      const prefersLight = window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches;
      const initial = prefersLight ? "light" : "dark";
      setTheme(initial);
      document.documentElement.setAttribute("data-theme", initial);
    }
  }, []);

  const toggleTheme = () => {
    const next: Theme = (theme === "dark" ? "light" : "dark");
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try { localStorage.setItem("theme", next); } catch {}
  };

  return (
    <div className={plex.variable}>
      {/* Theme toggle (sun/moon icon switches with state) */}
      <button className="theme-toggle" aria-label="Toggle color mode" onClick={toggleTheme}>
        {theme === "light" ? (
          /* Moon icon */
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 1 0 9.79 9.79z"/>
          </svg>
        ) : (
          /* Sun icon */
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12zm0 4a1 1 0 0 1-1-1v-1a1 1 0 1 1 2 0v1a1 1 0 0 1-1 1zm0-20a1 1 0 0 1 1 1v1a1 1 0 1 1-2 0V3a1 1 0 0 1 1-1zm10 10a1 1 0 0 1-1 1h-1a1 1 0 1 1 0-2h1a1 1 0 0 1 1 1zM4 12a1 1 0 0 1-1 1H2a1 1 0 1 1 0-2h1a1 1 0 0 1 1 1zm14.95 7.05a1 1 0 0 1-1.41 0l-.71-.71a1 1 0 0 1 1.41-1.41l.71.71a1 1 0 0 1 0 1.41zM6.17 6.17a1 1 0 0 1-1.41 0l-.71-.71A1 1 0 0 1 5.46 4l.71.71a1 1 0 0 1 0 1.46zM6.17 17.83a1 1 0 0 1 0 1.41l-.71.71A1 1 0 1 1 4 18.54l.71-.71a1 1 0 0 1 1.46 0zm12.02-12.02a1 1 0 0 1 1.41 0l.71.71A1 1 0 0 1 19.3 8.1l-.71-.71a1 1 0 0 1 0-1.58z"/>
          </svg>
        )}
      </button>

      <Component {...pageProps} />
    </div>
  );
}
