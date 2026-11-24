"use client";

import Link from "next/link";
import { createContext, useCallback, useContext, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";

const STORAGE_KEY = "paradise.compare.v1";
const MAX_COMPARISON_ITEMS = 4;
const EMPTY_IDS: string[] = [];
let storedIds: string[] = EMPTY_IDS;
let didReadStorage = false;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  if (!didReadStorage && typeof window !== "undefined") {
    didReadStorage = true;
    try {
      const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]") as unknown;
      if (Array.isArray(stored)) {
        storedIds = [...new Set(stored.filter((id): id is string => typeof id === "string"))].slice(0, MAX_COMPARISON_ITEMS);
      }
    } catch {
      storedIds = EMPTY_IDS;
    }
  }
  return storedIds;
}

function setStoredIds(nextIds: string[]) {
  storedIds = nextIds;
  let persisted = true;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(storedIds));
  } catch {
    persisted = false;
  }
  listeners.forEach((listener) => listener());
  return persisted;
}

type ComparisonContextValue = {
  ids: string[];
  toggle: (propertyId: string) => void;
  remove: (propertyId: string) => void;
  clear: () => void;
  notice: string;
};

const ComparisonContext = createContext<ComparisonContextValue | null>(null);

export function ComparisonProvider({ children }: { children: ReactNode }) {
  const ids = useSyncExternalStore(subscribe, getSnapshot, () => EMPTY_IDS);
  const [notice, setNotice] = useState("");

  const remove = useCallback((propertyId: string) => {
    const persisted = setStoredIds(ids.filter((id) => id !== propertyId));
    setNotice(persisted ? "" : "El navegador no permitió guardar tu lista de comparación.");
  }, [ids]);

  const toggle = useCallback((propertyId: string) => {
    if (ids.includes(propertyId)) {
      const persisted = setStoredIds(ids.filter((id) => id !== propertyId));
      setNotice(persisted ? "" : "El navegador no permitió guardar tu lista de comparación.");
      return;
    }
    if (ids.length >= MAX_COMPARISON_ITEMS) {
      setNotice("Puedes comparar hasta cuatro propiedades. Quita una para agregar otra.");
      return;
    }
    const persisted = setStoredIds([...ids, propertyId]);
    setNotice(persisted ? "" : "El navegador no permitió guardar tu lista de comparación.");
  }, [ids]);

  const clear = useCallback(() => {
    const persisted = setStoredIds([]);
    setNotice(persisted ? "" : "El navegador no permitió guardar tu lista de comparación.");
  }, []);

  const value = useMemo(() => ({ ids, toggle, remove, clear, notice }), [ids, toggle, remove, clear, notice]);
  return (
    <ComparisonContext.Provider value={value}>
      {children}
      {ids.length ? (
        <aside aria-label="Comparación de propiedades" className="comparison-tray">
          <span><strong>{ids.length}</strong> de 4 en comparación</span>
          {notice ? <span aria-live="polite" className="comparison-tray__notice" role="status">{notice}</span> : null}
          <Link className="button button--primary button--small" href="/comparar">Comparar ahora</Link>
          <button className="comparison-tray__clear" onClick={clear} type="button">Vaciar</button>
        </aside>
      ) : null}
    </ComparisonContext.Provider>
  );
}

export function useComparison() {
  const value = useContext(ComparisonContext);
  if (!value) throw new Error("useComparison debe usarse dentro de ComparisonProvider");
  return value;
}
