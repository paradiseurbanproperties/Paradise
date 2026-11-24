"use client";

import { useEffect } from "react";

const sessionStorageKey = "paradise:analytics:tab-session";

function getTabSessionId(): string | null {
  try {
    let sessionId = window.sessionStorage.getItem(sessionStorageKey);
    if (!sessionId) {
      sessionId = window.crypto.randomUUID();
      window.sessionStorage.setItem(sessionStorageKey, sessionId);
    }
    return sessionId;
  } catch {
    return null;
  }
}

export function PropertyViewTracker({ propertyId }: { propertyId: string }) {
  useEffect(() => {
    const sessionId = getTabSessionId();
    if (!sessionId) return;

    const utcDay = new Date().toISOString().slice(0, 10);
    const sentKey = `paradise:analytics:view:${propertyId}:${utcDay}`;
    try {
      if (window.sessionStorage.getItem(sentKey)) return;
    } catch {
      return;
    }

    void fetch("/api/analytics/property-view", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ propertyId, sessionId }),
      keepalive: true,
    }).then((response) => {
      if (response.ok) window.sessionStorage.setItem(sentKey, "1");
    }).catch(() => {
      // El registro de analítica nunca debe interrumpir la lectura de la ficha.
    });
  }, [propertyId]);

  return null;
}
