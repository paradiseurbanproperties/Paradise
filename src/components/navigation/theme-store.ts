"use client";

import { useSyncExternalStore } from "react";
import { THEME_STORAGE_KEY, type ColorTheme } from "@/constants/theme";

const THEME_CHANGE_EVENT = "paradise-theme-change";

function getThemeSnapshot(): ColorTheme {
  if (typeof document === "undefined") return "light";
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function getServerThemeSnapshot(): ColorTheme {
  return "light";
}

function subscribeToTheme(onChange: () => void) {
  window.addEventListener(THEME_CHANGE_EVENT, onChange);
  return () => window.removeEventListener(THEME_CHANGE_EVENT, onChange);
}

export function useCurrentTheme() {
  return useSyncExternalStore(subscribeToTheme, getThemeSnapshot, getServerThemeSnapshot);
}

export function setCurrentTheme(theme: ColorTheme) {
  document.documentElement.dataset.theme = theme;

  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // The selected theme remains active for this page view when storage is unavailable.
  }

  window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
}
