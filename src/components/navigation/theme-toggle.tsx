"use client";

import { setCurrentTheme, useCurrentTheme } from "@/components/navigation/theme-store";

export function ThemeToggle() {
  const theme = useCurrentTheme();

  function toggleTheme() {
    setCurrentTheme(theme === "dark" ? "light" : "dark");
  }

  return (
    <button
      aria-label={theme === "dark" ? "Cambiar al tema claro" : "Cambiar al tema oscuro"}
      className="theme-toggle"
      onClick={toggleTheme}
      title={theme === "dark" ? "Tema claro" : "Tema oscuro"}
      type="button"
    >
      <svg
        aria-hidden="true"
        className="theme-toggle__icon"
        fill="none"
        viewBox="0 0 24 24"
      >
        {theme === "dark" ? (
          <>
            <circle cx="12" cy="12" r="3.6" />
            <path d="M12 2.5v2M12 19.5v2M4.6 4.6 6 6m12 12 1.4 1.4M2.5 12h2m15 0h2M4.6 19.4 6 18m12-12 1.4-1.4" />
          </>
        ) : (
          <path d="M19.2 15.4A8 8 0 0 1 8.6 4.8 8.2 8.2 0 1 0 19.2 15.4Z" />
        )}
      </svg>
      <span className="theme-toggle__label">Tema</span>
    </button>
  );
}
