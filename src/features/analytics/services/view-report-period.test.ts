import { describe, expect, it } from "vitest";
import { getViewReportDates, resolveViewReportWindow } from "./view-report-period";

describe("ventanas del reporte de vistas", () => {
  it("acepta solo los periodos admitidos y vuelve a 28 ante entrada inválida", () => {
    expect(resolveViewReportWindow("7")).toBe(7);
    expect(resolveViewReportWindow("90")).toBe(90);
    expect(resolveViewReportWindow("30")).toBe(28);
    expect(resolveViewReportWindow(7)).toBe(28);
  });

  it("devuelve fechas UTC consecutivas incluyendo hoy", () => {
    expect(getViewReportDates(7, new Date("2026-11-24T18:30:00.000Z"))).toEqual([
      "2026-11-18",
      "2026-11-19",
      "2026-11-20",
      "2026-11-21",
      "2026-11-22",
      "2026-11-23",
      "2026-11-24",
    ]);
  });
});
