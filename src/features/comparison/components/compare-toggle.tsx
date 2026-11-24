"use client";

import { useComparison } from "@/features/comparison/components/comparison-provider";

export function CompareToggle({ propertyId }: { propertyId: string }) {
  const { ids, toggle } = useComparison();
  const included = ids.includes(propertyId);
  return (
    <button
      aria-pressed={included}
      className={`compare-toggle${included ? " compare-toggle--active" : ""}`}
      onClick={() => toggle(propertyId)}
      type="button"
    >
      <span aria-hidden="true">⇄</span> {included ? "En comparación" : "Comparar"}
    </button>
  );
}
